import { createAdminClient } from '@/lib/supabase/admin'
import { getPlatformSettings, retailPrice } from '@/lib/platform/settings'
import { fetchFiveSimCountries, fetchFiveSimQuote } from '@/lib/providers/fivesim'
import { recordFiveSimCost } from '@/lib/providers/sms-accounting'
import { markWalletPurchaseSubmitted, PurchaseReservationError, releaseWalletPurchase, reserveWalletPurchase } from '@/lib/wallet/purchase-reservation'

const baseUrl = (process.env.SMS_PROVIDER_BASE_URL || 'https://5sim.net/v1').replace(/\/$/, '')

type ProviderOrder = { id?: number | string; phone?: string; expires?: string; error?: string; price?:number }

export type BotSmsReservation =
  | { kind: 'success'; phone: string; priceXaf: number; service: string; country: string; expiresAt: string }
  | { kind: 'insufficient'; requiredXaf: number; balanceXaf: number }
  | { kind: 'unavailable'; message: string }
  | { kind: 'error'; message: string }

export type BotSmsStatus =
  | { kind: 'received'; code: string }
  | { kind: 'waiting'; expiresAt?: string }
  | { kind: 'ended'; message: string }
  | { kind: 'canceled'; refundedXaf: number }
  | { kind: 'error'; message: string }

function countryForInput(input: string, countries: Awaited<ReturnType<typeof fetchFiveSimCountries>>) {
  const normalized = input.trim().toLowerCase().replace(/\s+/g, '')
  return countries.find((country) => country.slug === normalized || country.label.toLowerCase().replace(/\s+/g, '') === normalized)
}

export async function reserveLiveBotSms(profileId: string, countryInput: string, productInput: string): Promise<BotSmsReservation> {
  const token = process.env.SMS_PROVIDER_API_KEY
  if (!token) return { kind: 'error', message: 'Temporary-number ordering is not configured yet.' }
  const product = decodeURIComponent(productInput).toLowerCase()
  if (!/^[a-z0-9_-]+$/.test(product)) return { kind: 'error', message: 'That verification service is invalid.' }

  try {
    const admin = createAdminClient()
    const [countries, profileResult, settings] = await Promise.all([
      fetchFiveSimCountries(baseUrl),
      admin.from('profiles').select('id, balance_xaf, refund_hold').eq('id', profileId).maybeSingle(),
      getPlatformSettings(admin),
    ])
    const country = countryForInput(countryInput, countries)
    if (!country) return { kind: 'unavailable', message: 'That country is no longer available. Please choose another country.' }
    if (!profileResult.data) return { kind: 'error', message: 'Your customer wallet could not be found.' }
    if (profileResult.data.refund_hold) return { kind: 'error', message: 'Purchases are paused while your unused-deposit return is reserved. Contact customer support for help.' }

    const quote = await fetchFiveSimQuote(baseUrl, country.slug, product)
    if (!quote) return { kind: 'unavailable', message: 'This verification number is no longer available. Please choose another service.' }
    const priceXaf = retailPrice(quote.costUsd * 600, settings.sms_markup_multiplier, settings.extra_service_markup_percent)
    const balanceXaf = Number(profileResult.data.balance_xaf || 0)
    if (balanceXaf < priceXaf) return { kind: 'insufficient', requiredXaf: priceXaf, balanceXaf }

    let reservationId: string
    try {
      reservationId = await reserveWalletPurchase(admin, profileId, 'sms_purchase', 'bot', priceXaf)
    } catch (error) {
      if (error instanceof PurchaseReservationError && error.status === 402)
        return { kind: 'insufficient', requiredXaf: priceXaf, balanceXaf }
      return { kind: 'error', message: error instanceof Error ? error.message : 'Ordering is temporarily unavailable.' }
    }
    let providerResponse: Response
    try {
      providerResponse = await fetch(`${baseUrl}/user/buy/activation/${encodeURIComponent(country.slug)}/${encodeURIComponent(quote.operator)}/${encodeURIComponent(product)}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        signal: AbortSignal.timeout(20_000),
      })
    } catch (error) {
      console.error('[Bot SMS supplier outcome unknown]', reservationId, error)
      return { kind: 'error', message: `Supplier response is uncertain. Funds are reserved; contact support with ${reservationId} before retrying.` }
    }
    const providerOrder = await providerResponse.json().catch(() => ({})) as ProviderOrder
    if (providerOrder.id) {
      try { await markWalletPurchaseSubmitted(admin, reservationId, String(providerOrder.id)) }
      catch (error) {
        console.error('[Bot SMS supplier accepted but reservation update failed]', reservationId, providerOrder.id, error)
        return { kind: 'error', message: `Supplier accepted the number but recording it needs support review. Funds are reserved; contact support with ${reservationId} before retrying.` }
      }
    }
    if (!providerOrder.id || !providerOrder.phone) {
      if (!providerOrder.id && providerOrder.error) {
        try { await releaseWalletPurchase(admin, reservationId) }
        catch (error) {
          console.error('[Bot SMS supplier declined but release failed]', reservationId, error)
          return { kind: 'error', message: `Supplier declined, but releasing reserved funds needs support review. Contact support with ${reservationId}.` }
        }
        return { kind: 'unavailable', message: providerOrder.error }
      }
      console.error('[Bot SMS supplier response without order]', reservationId, providerResponse.status)
      return { kind: 'error', message: `Supplier response is uncertain. Funds are reserved; contact support with ${reservationId} before retrying.` }
    }
    const expiresAt = providerOrder.expires || new Date(Date.now() + 20 * 60 * 1000).toISOString()
    const { data: localOrder, error: orderError } = await admin.from('sms_orders').insert({
      id: reservationId,
      profile_id: profileId,
      provider_order_id: String(providerOrder.id),
      service_name: product.replace(/[-_]+/g, ' '),
      service_code: product,
      country_name: country.label,
      country_code: country.slug,
      phone_number: providerOrder.phone,
      price_xaf: priceXaf,
      status: 'waiting_sms',
      expires_at: expiresAt,
    }).select('id').single()
    if (orderError || !localOrder) {
      console.error('[Bot SMS supplier accepted, local order save failed]', reservationId, orderError)
      return { kind: 'error', message: `Supplier accepted the number but saving it needs support review. Funds are reserved; contact support with ${reservationId} before retrying.` }
    }
    await recordFiveSimCost(admin,{orderId:localOrder.id,quoteUsd:quote.costUsd,actualUsd:providerOrder.price,operator:quote.operator,service:product,country:country.slug})
    return { kind: 'success', phone: providerOrder.phone, priceXaf, service: product, country: country.label, expiresAt }
  } catch (error) {
    console.error('[Bot SMS reservation failed]', error)
    return { kind: 'error', message: 'Could not finish this number request. If funds were reserved, contact support before retrying.' }
  }
}

export async function checkLatestBotSms(profileId: string): Promise<BotSmsStatus> {
  const token = process.env.SMS_PROVIDER_API_KEY
  if (!token) return { kind: 'error', message: 'Temporary-number ordering is not configured yet.' }
  try {
    const admin = createAdminClient()
    const { data: order } = await admin.from('sms_orders')
      .select('id, provider_order_id, status, expires_at, sms_code')
      .eq('profile_id', profileId).eq('status', 'waiting_sms').order('created_at', { ascending: false }).limit(1).maybeSingle()
    if (!order?.provider_order_id) return { kind: 'ended', message: 'You have no active verification-number request.' }
    const response = await fetch(`${baseUrl}/user/check/${encodeURIComponent(order.provider_order_id)}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }, signal: AbortSignal.timeout(15_000),
    })
    const provider = await response.json().catch(() => ({})) as { sms?: Array<{ code?: string }>; status?: string; expires?: string; error?: string }
    if (!response.ok) return { kind: 'error', message: provider.error || 'Could not check the SMS code right now.' }
    const code = provider.sms?.find((sms) => sms.code)?.code
    if (code) {
      const { error: saveError } = await admin.from('sms_orders').update({ sms_code: code, status: 'received' }).eq('id', order.id).eq('status', 'waiting_sms')
      if (saveError) return { kind: 'error', message: 'The supplier returned a code but saving it failed. Please retry shortly.' }
      await fetch(`${baseUrl}/user/finish/${encodeURIComponent(order.provider_order_id)}`, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } }).catch(() => undefined)
      return { kind: 'received', code }
    }
    const supplierStatus = String(provider.status || '').toUpperCase()
    if (['CANCELED', 'BANNED', 'TIMEOUT'].includes(supplierStatus) && Array.isArray(provider.sms) && provider.sms.length === 0) {
      if (supplierStatus === 'BANNED') {
        const { error: closeError } = await admin.from('sms_orders').update({ status: 'canceled' }).eq('id', order.id).eq('status', 'waiting_sms').is('sms_code', null)
        if (closeError) return { kind: 'error', message: 'Could not update this number’s status. Please retry shortly.' }
      } else {
        const { error: refundError } = await admin.rpc('refund_ended_sms_order', {
          p_order_id: order.id, p_provider_order_id: order.provider_order_id,
          p_final_status: supplierStatus === 'TIMEOUT' ? 'expired' : 'canceled',
        })
        if (refundError) return { kind: 'error', message: 'This number ended, but wallet reconciliation is still in progress. Please retry shortly.' }
        return { kind: 'canceled', refundedXaf: Number((await admin.from('sms_orders').select('price_xaf').eq('id', order.id).single()).data?.price_xaf || 0) }
      }
      return { kind: 'ended', message: 'This verification-number request has ended without a code.' }
    }
    return { kind: 'waiting', expiresAt: provider.expires || order.expires_at }
  } catch (error) {
    console.error('[Bot SMS status check failed]', error)
    return { kind: 'error', message: 'Could not check the SMS code right now.' }
  }
}

export async function cancelLatestBotSms(profileId: string): Promise<BotSmsStatus> {
  const token = process.env.SMS_PROVIDER_API_KEY
  if (!token) return { kind: 'error', message: 'Temporary-number ordering is not configured yet.' }
  try {
    const admin = createAdminClient()
    const { data: order } = await admin.from('sms_orders')
      .select('id,provider_order_id,status,expires_at,sms_code,price_xaf')
      .eq('profile_id', profileId).eq('status', 'waiting_sms').order('created_at', { ascending: false }).limit(1).maybeSingle()
    if (!order?.provider_order_id) return { kind: 'ended', message: 'You have no active verification-number request to cancel.' }
    if (order.sms_code) return { kind: 'received', code: order.sms_code }
    const response = await fetch(`${baseUrl}/user/cancel/${encodeURIComponent(order.provider_order_id)}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }, signal: AbortSignal.timeout(15_000),
    })
    const provider = await response.json().catch(() => ({})) as { status?: string; sms?: Array<{ code?: string }>; error?: string }
    if (!response.ok) return { kind: 'error', message: provider.error || 'The provider could not confirm cancellation. Your wallet has not been refunded.' }
    const code = provider.sms?.find(sms => sms.code)?.code
    if (code) {
      const { error } = await admin.from('sms_orders').update({ sms_code: code, status: 'received' }).eq('id', order.id).eq('status', 'waiting_sms')
      if (error) return { kind: 'error', message: 'A code arrived during cancellation. Please retry the status check; no refund was issued.' }
      return { kind: 'received', code }
    }
    if (String(provider.status || '').toUpperCase() !== 'CANCELED' || !Array.isArray(provider.sms) || provider.sms.length) {
      return { kind: 'error', message: 'The provider has not confirmed an unused cancellation. Your wallet was not refunded.' }
    }
    const { error } = await admin.rpc('refund_ended_sms_order', {
      p_order_id: order.id, p_provider_order_id: order.provider_order_id, p_final_status: 'canceled',
    })
    if (error) return { kind: 'error', message: 'The provider canceled the number, but wallet reconciliation needs support.' }
    return { kind: 'canceled', refundedXaf: Number(order.price_xaf) }
  } catch (error) {
    console.error('[Bot SMS cancellation failed]', error)
    return { kind: 'error', message: 'Cancellation could not be confirmed. Your wallet has not been refunded yet.' }
  }
}
