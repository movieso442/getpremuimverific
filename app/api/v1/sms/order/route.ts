import { NextResponse } from 'next/server'
import { SMS_SERVICES } from '@/lib/mockData'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getPlatformSettings, retailPrice } from '@/lib/platform/settings'
import { fetchFiveSimQuote } from '@/lib/providers/fivesim'

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

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { action = 'getNumber', service = 'wa', country = 'US', id } = body as {
      action?: string; service?: string; country?: string; id?: string | number
    }
    const token = process.env.SMS_PROVIDER_API_KEY
    if (!token) return NextResponse.json({ error: '5SIM is not configured. No funds were charged.' }, { status: 503 })

    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Sign in before requesting a number.' }, { status: 401 })

    const admin = createAdminClient()
    const { data: profile, error: profileError } = await admin.from('profiles').select('*').eq('user_id', user.id).single()
    if (profileError || !profile) return NextResponse.json({ error: 'Your wallet profile is unavailable. Please sign in again.' }, { status: 409 })

    if (action === 'getStatus' || action === 'getSms') {
      if (!id) return NextResponse.json({ error: '5SIM order ID is required.' }, { status: 400 })
      const providerOrderId = String(id)
      const { data: localOrder } = await admin.from('sms_orders')
        .select('id, status').eq('profile_id', profile.id).eq('provider_order_id', providerOrderId).maybeSingle()
      if (!localOrder) return NextResponse.json({ error: 'SMS order not found.' }, { status: 404 })

      const providerRes = await fetch(`${FIVE_SIM_BASE_URL}/user/check/${encodeURIComponent(providerOrderId)}`, {
        headers: fiveSimHeaders(token), signal: AbortSignal.timeout(15_000),
      })
      const providerOrder = await providerRes.json().catch(() => ({})) as FiveSimOrder & { error?: string }
      if (!providerRes.ok) return NextResponse.json({ error: providerOrder.error || '5SIM could not check this order.' }, { status: 502 })

      const code = providerOrder.sms?.find((sms) => sms.code)?.code
      if (code) {
        await admin.from('sms_orders').update({ sms_code: code, status: 'received' }).eq('id', localOrder.id)
        // Mark the activation complete at 5SIM after we safely record the code.
        await fetch(`${FIVE_SIM_BASE_URL}/user/finish/${encodeURIComponent(providerOrderId)}`, {
          headers: fiveSimHeaders(token), signal: AbortSignal.timeout(15_000),
        }).catch(() => undefined)
        return NextResponse.json({ status: 'RECEIVED', code })
      }

      if (providerOrder.status === 'CANCELED' || providerOrder.status === 'BANNED') {
        await admin.from('sms_orders').update({ status: 'canceled' }).eq('id', localOrder.id)
        return NextResponse.json({ status: 'CANCELED' })
      }
      return NextResponse.json({ status: 'WAITING_SMS', expires_at: providerOrder.expires })
    }

    const catalogService = SMS_SERVICES.find((item) => item.code === service)
    const providerCountry = COUNTRY_SLUGS[country]
    const providerProduct = PRODUCT_SLUGS[service]
    if (!catalogService || !providerCountry || !providerProduct)
      return NextResponse.json({ error: 'This SMS service or country is not supported by 5SIM.' }, { status: 400 })
    // 5SIM's public catalogue provides the current cost and available quantity for
    // each country/product/operator. Select the cheapest available live operator;
    // the browser's displayed price is never used for charging.
    const quote = await fetchFiveSimQuote(FIVE_SIM_BASE_URL, providerCountry, providerProduct)
    if (!quote)
      return NextResponse.json({ error: '5SIM has no number available for this service and country. No funds were charged.' }, { status: 409 })

    const settings = await getPlatformSettings(admin)
    const providerCostXaf = quote.costUsd * 600
    const priceXaf = retailPrice(providerCostXaf, settings.sms_markup_multiplier)
    if (Number(profile.balance_xaf) < priceXaf)
      return NextResponse.json({ error: 'Insufficient wallet balance.', required_xaf: priceXaf }, { status: 402 })

    const providerRes = await fetch(
      `${FIVE_SIM_BASE_URL}/user/buy/activation/${encodeURIComponent(providerCountry)}/${encodeURIComponent(quote.operator)}/${encodeURIComponent(providerProduct)}`,
      { headers: fiveSimHeaders(token), signal: AbortSignal.timeout(20_000) },
    )
    const providerOrder = await providerRes.json().catch(() => ({})) as FiveSimOrder & { error?: string }
    if (!providerRes.ok || !providerOrder.id || !providerOrder.phone)
      return NextResponse.json({ error: providerOrder.error || '5SIM has no number available. No funds were charged.' }, { status: 502 })

    const { data: order, error: orderError } = await admin.from('sms_orders').insert({
      profile_id: profile.id, provider_order_id: String(providerOrder.id), service_name: catalogService.name,
      service_code: service, country_name: country, country_code: country, phone_number: providerOrder.phone,
      price_xaf: priceXaf, status: 'waiting_sms', expires_at: providerOrder.expires || new Date(Date.now() + 20 * 60 * 1000).toISOString(),
    }).select().single()
    if (orderError) throw orderError

    const { error: transactionError } = await admin.from('wallet_transactions').insert({
      profile_id: profile.id, amount: priceXaf, type: 'sms_purchase', payment_method: 'mtn_momo',
      reference: `SMS-${order.id}`, status: 'completed', description: `5SIM ${catalogService.name} activation via ${quote.operator}`,
    })
    if (transactionError) throw transactionError

    return NextResponse.json({ id: String(providerOrder.id), order, phone: providerOrder.phone, status: 'WAITING_SMS' }, { status: 201 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
