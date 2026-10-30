import { NextResponse } from 'next/server'
import { SMS_SERVICES } from '@/lib/mockData'
import { customerUser } from '@/lib/supabase/customer'
import { createAdminClient } from '@/lib/supabase/admin'
import { getPlatformSettings, retailPrice } from '@/lib/platform/settings'
import { fetchFiveSimQuote } from '@/lib/providers/fivesim'
import { scheduleAdminNotifications } from '@/lib/notifications/admin-email'
import { recordFiveSimCost } from '@/lib/providers/sms-accounting'
import { markWalletPurchaseSubmitted, PurchaseReservationError, releaseWalletPurchase, reserveWalletPurchase } from '@/lib/wallet/purchase-reservation'
import { syncSmsOrder } from '@/lib/sms/sync'

const FIVE_SIM_BASE_URL = (process.env.SMS_PROVIDER_BASE_URL || 'https://5sim.net/v1').replace(/\/$/, '')
const COUNTRY_SLUGS: Record<string, string> = {
  US: 'usa', GB: 'england', CA: 'canada', AU: 'australia', BR: 'brazil', MX: 'mexico',
  ES: 'spain', TH: 'thailand', CM: 'cameroon', NG: 'nigeria', FR: 'france', DE: 'germany', ZA: 'southafrica',
}
const PRODUCT_SLUGS: Record<string, string> = {
  fb: 'facebook', wa: 'whatsapp', tg: 'telegram', tt: 'tiktok', ig: 'instagram', go: 'google',
  oa: 'openai', nf: 'netflix', pp: 'paypal', ds: 'discord', tw: 'twitter', td: 'tinder',
}
type FiveSimSms = { code?: string; text?: string }
type FiveSimOrder = { id?: number; phone?: string; status?: string; expires?: string; price?: number; sms?: FiveSimSms[] }

function fiveSimHeaders(token: string) {
  return { Authorization: `Bearer ${token}`, Accept: 'application/json' }
}

export async function GET(request: Request) {
  const user = await customerUser(request)
  if (!user) return NextResponse.json({ error: 'Sign in to view your SMS inbox.' }, { status: 401 })
  const admin = createAdminClient()
  const { data: profile, error: profileError } = await admin.from('profiles')
    .select('id').eq('user_id', user.id).single()
  if (profileError || !profile) return NextResponse.json({ error: 'Your profile is unavailable.' }, { status: 409 })
  const { data: orders, error } = await admin.from('sms_orders')
    .select('id, provider_order_id, service_name, country_name, phone_number, sms_code, status, expires_at, created_at, price_xaf')
    .eq('profile_id', profile.id).order('created_at', { ascending: false }).limit(50)
  if (error) return NextResponse.json({ error: 'Your SMS inbox could not be loaded.' }, { status: 503 })
  return NextResponse.json({ orders }, { headers: { 'Cache-Control': 'private, no-store' } })
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { action = 'getNumber', service = 'wa', country = 'US', id } = body as {
      action?: string; service?: string; country?: string; id?: string | number
    }
    const token = process.env.SMS_PROVIDER_API_KEY
    if (!token) return NextResponse.json({ error: '5SIM is not configured. No funds were charged.' }, { status: 503 })

    const user = await customerUser(request)
    if (!user) return NextResponse.json({ error: 'Sign in before requesting a number.' }, { status: 401 })

    const admin = createAdminClient()
    const { data: profile, error: profileError } = await admin.from('profiles').select('*').eq('user_id', user.id).single()
    if (profileError || !profile) return NextResponse.json({ error: 'Your wallet profile is unavailable. Please sign in again.' }, { status: 409 })
    if (profile.refund_hold && !['getStatus','getSms','cancel'].includes(action)) return NextResponse.json({ error: 'Purchases are paused during an unused-deposit return. Contact support.' }, { status: 409 })

    if (action === 'cancel') {
      if (typeof id !== 'string' || !/^[0-9a-f-]{36}$/i.test(id))
        return NextResponse.json({ error: 'A valid SMS order is required.' }, { status: 400 })
      const { data: order } = await admin.from('sms_orders')
        .select('id,provider_order_id,status,sms_code,profile_id,phone_number,service_name,price_xaf')
        .eq('id', id).eq('profile_id', profile.id).maybeSingle()
      if (!order) return NextResponse.json({ error: 'SMS order not found.' }, { status: 404 })
      if (order.sms_code || order.status === 'received')
        return NextResponse.json({ error: 'A code has arrived, so this number can no longer be canceled or refunded.' }, { status: 409 })
      if (order.status !== 'waiting_sms') {
        const { data: priorRefund } = await admin.from('wallet_transactions')
          .select('amount').eq('profile_id', profile.id).eq('reference', `SMS-END-REFUND-${order.id}`).maybeSingle()
        if (priorRefund) return NextResponse.json({ status: order.status.toUpperCase(), refunded_xaf: priorRefund.amount, already_refunded: true })
        return NextResponse.json({ error: 'This number is no longer active.' }, { status: 409, headers: { 'Cache-Control': 'private, no-store' } })
      }
      if (!order.provider_order_id) return NextResponse.json({ error: 'Supplier order is unavailable. Contact support before retrying.' }, { status: 409 })

      let providerResponse: Response
      try {
        providerResponse = await fetch(`${FIVE_SIM_BASE_URL}/user/cancel/${encodeURIComponent(order.provider_order_id)}`, {
          headers: fiveSimHeaders(token), signal: AbortSignal.timeout(15_000),
        })
      } catch (error) {
        console.error('[SMS cancellation outcome unknown]', order.id, error)
        return NextResponse.json({ error: 'The supplier did not confirm cancellation. Your wallet has not been refunded yet. Refresh your inbox before retrying and do not repurchase until the order status is clear.' }, { status: 503 })
      }
      const providerOrder = await providerResponse.json().catch(() => ({})) as FiveSimOrder & { error?: string }
      if (!providerResponse.ok)
        return NextResponse.json({ error: providerOrder.error || 'The provider could not confirm cancellation. Your wallet has not been refunded; refresh and try again.' }, { status: 409 })
      const providerStatus = String(providerOrder.status || '').toUpperCase()
      if (providerOrder.sms?.some(message => message.code)) {
        await syncSmsOrder(admin, order)
        return NextResponse.json({ error: 'A code arrived while cancellation was processing. The order was not refunded.' }, { status: 409 })
      }
      if (!['CANCELED', 'BANNED', 'TIMEOUT'].includes(providerStatus) || !Array.isArray(providerOrder.sms) || providerOrder.sms.length > 0)
        return NextResponse.json({ error: 'The provider has not confirmed an unused cancellation. Your wallet was not refunded.' }, { status: 409 })

      const finalStatus = providerStatus === 'TIMEOUT' ? 'expired' : 'canceled'
      const { data: result, error: refundError } = await admin.rpc('refund_ended_sms_order', {
        p_order_id: order.id, p_provider_order_id: order.provider_order_id, p_final_status: finalStatus,
      })
      if (refundError) {
        console.error('[SMS cancellation wallet refund failed]', order.id, refundError)
        return NextResponse.json({ error: 'The provider canceled the number, but wallet reconciliation needs support. Please do not repurchase yet.' }, { status: 503 })
      }
      return NextResponse.json({ status: finalStatus.toUpperCase(), refunded_xaf: result?.refunded_xaf ?? order.price_xaf })
    }

    if (action === 'getStatus' || action === 'getSms') {
      if (!id) return NextResponse.json({ error: '5SIM order ID is required.' }, { status: 400 })
      const providerOrderId = String(id)
      const { data: localOrder } = await admin.from('sms_orders')
        .select('id, status, sms_code, provider_order_id, phone_number, service_name, profile_id').eq('profile_id', profile.id).eq('provider_order_id', providerOrderId).maybeSingle()
      if (!localOrder) return NextResponse.json({ error: 'SMS order not found.' }, { status: 404 })
      if (localOrder.sms_code) return NextResponse.json({ status: 'RECEIVED', code: localOrder.sms_code })
      if (localOrder.status === 'canceled' || localOrder.status === 'expired')
        return NextResponse.json({ status: localOrder.status.toUpperCase() })

      try {
        await syncSmsOrder(admin, localOrder)
      } catch (error) {
        console.error('[SMS status check failed]', localOrder.id, error)
        return NextResponse.json({ error: 'Supplier status is temporarily unavailable. Your order remains visible and support can investigate.' }, { status: 502 })
      }
      const { data: refreshed, error: refreshError } = await admin.from('sms_orders')
        .select('status,sms_code,expires_at').eq('id', localOrder.id).single()
      if (refreshError || !refreshed) return NextResponse.json({ error: 'Could not reload your SMS order.' }, { status: 503 })
      return NextResponse.json({ status: refreshed.status.toUpperCase(), code: refreshed.sms_code, expires_at: refreshed.expires_at })
    }

    const catalogService = SMS_SERVICES.find((item) => item.code === service)
    const providerCountry = COUNTRY_SLUGS[country]
    const providerProduct = PRODUCT_SLUGS[service]
    if (!catalogService || !providerCountry || !providerProduct)
      return NextResponse.json({ error: 'This SMS service or country is not supported by 5SIM.' }, { status: 400 })
    // 5SIM's public catalogue provides the current cost and available quantity for
    // each country/product/operator. Select the cheapest available live operator;
    // the browser's displayed price is never used for charging.
    let quote
    try {
      quote = await fetchFiveSimQuote(FIVE_SIM_BASE_URL, providerCountry, providerProduct)
    } catch (error) {
      console.error('[SMS quote unavailable]', { service, country, error })
      return NextResponse.json({ error: 'The live provider could not return a price right now. No funds were charged. Please retry shortly or choose another service or country.' }, { status: 503 })
    }
    if (!quote)
      return NextResponse.json({ error: '5SIM has no number available for this service and country. No funds were charged.' }, { status: 409 })

    const settings = await getPlatformSettings(admin)
    const providerCostXaf = quote.costUsd * 600
    const priceXaf = retailPrice(providerCostXaf, settings.sms_markup_multiplier, settings.extra_service_markup_percent)
    if (action === 'quote') return NextResponse.json({ price_xaf: priceXaf, available: quote.available }, { headers: { 'Cache-Control': 'private, no-store' } })
    if (action !== 'getNumber') return NextResponse.json({ error: 'Unknown SMS action.' }, { status: 400 })
    if (body.max_price_xaf!==undefined && (!Number.isFinite(body.max_price_xaf)||body.max_price_xaf<=0))return NextResponse.json({error:'Invalid confirmed price.'},{status:400})
    if (body.max_price_xaf!==undefined && priceXaf>body.max_price_xaf)return NextResponse.json({error:'The live price changed. Review the new price and confirm again.',required_xaf:priceXaf},{status:409})
    const reservationId = await reserveWalletPurchase(admin, profile.id, 'sms_purchase', 'web', priceXaf)
    let providerRes: Response
    try {
      providerRes = await fetch(
        `${FIVE_SIM_BASE_URL}/user/buy/activation/${encodeURIComponent(providerCountry)}/${encodeURIComponent(quote.operator)}/${encodeURIComponent(providerProduct)}`,
        { headers: fiveSimHeaders(token), signal: AbortSignal.timeout(20_000) },
      )
    } catch (error) {
      console.error('[SMS supplier outcome unknown]', reservationId, error)
      return NextResponse.json({ error: 'Supplier response is uncertain. Your funds are reserved; contact support before retrying.', reservation_id: reservationId }, { status: 503 })
    }
    const providerOrder = await providerRes.json().catch(() => ({})) as FiveSimOrder & { error?: string }
    if (providerOrder.id) {
      try { await markWalletPurchaseSubmitted(admin, reservationId, String(providerOrder.id)) }
      catch (error) {
        console.error('[SMS supplier accepted but reservation update failed]', reservationId, providerOrder.id, error)
        return NextResponse.json({ error: 'Supplier accepted the number but recording it needs support review. Your funds are reserved; do not retry.', reservation_id: reservationId }, { status: 503 })
      }
    }
    if (!providerOrder.id || !providerOrder.phone) {
      if (!providerOrder.id && providerOrder.error) {
        try { await releaseWalletPurchase(admin, reservationId) }
        catch (error) {
          console.error('[SMS supplier declined but release failed]', reservationId, error)
          return NextResponse.json({ error: 'Supplier declined, but releasing reserved funds needs support review.', reservation_id: reservationId }, { status: 503 })
        }
        return NextResponse.json({ error: providerOrder.error, charge_xaf: 0 }, { status: 502 })
      }
      console.error('[SMS supplier response without order]', reservationId, providerRes.status)
      return NextResponse.json({ error: 'Supplier response is uncertain. Your funds are reserved; contact support before retrying.', reservation_id: reservationId }, { status: 503 })
    }

    const { data: order, error: orderError } = await admin.from('sms_orders').insert({
      id: reservationId,
      profile_id: profile.id, provider_order_id: String(providerOrder.id), service_name: catalogService.name,
      service_code: service, country_name: country, country_code: country, phone_number: providerOrder.phone,
      price_xaf: priceXaf, status: 'waiting_sms', expires_at: providerOrder.expires || new Date(Date.now() + 20 * 60 * 1000).toISOString(),
    }).select().single()
    if (orderError) {
      console.error('[SMS supplier accepted, local order save failed]', reservationId, orderError)
      return NextResponse.json({ error: 'Supplier accepted the order but saving it needs support review. Your funds are reserved; do not retry.', reservation_id: reservationId }, { status: 503 })
    }
    await recordFiveSimCost(admin,{orderId:order.id,quoteUsd:quote.costUsd,actualUsd:providerOrder.price,operator:quote.operator,service:providerProduct,country:providerCountry})
    scheduleAdminNotifications(admin)

    return NextResponse.json({ id: String(providerOrder.id), order, phone: providerOrder.phone, status: 'WAITING_SMS' }, { status: 201 })
  } catch (error: unknown) {
    if (error instanceof PurchaseReservationError)
      return NextResponse.json({ error: error.message }, { status: error.status })
    console.error('[SMS order failed]', error)
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
