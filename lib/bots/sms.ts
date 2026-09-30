import { createAdminClient } from '@/lib/supabase/admin'
import { getPlatformSettings, retailPrice } from '@/lib/platform/settings'
import { fetchFiveSimCountries, fetchFiveSimQuote } from '@/lib/providers/fivesim'

const baseUrl = (process.env.SMS_PROVIDER_BASE_URL || 'https://5sim.net/v1').replace(/\/$/, '')

type ProviderOrder = { id?: number | string; phone?: string; expires?: string; error?: string }

export type BotSmsReservation =
  | { kind: 'success'; phone: string; priceXaf: number; service: string; country: string; expiresAt: string }
  | { kind: 'insufficient'; requiredXaf: number; balanceXaf: number }
  | { kind: 'unavailable'; message: string }
  | { kind: 'error'; message: string }

export type BotSmsStatus =
  | { kind: 'received'; code: string }
  | { kind: 'waiting'; expiresAt?: string }
  | { kind: 'ended'; message: string }
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
      admin.from('profiles').select('id, balance_xaf').eq('id', profileId).maybeSingle(),
      getPlatformSettings(admin),
    ])
    const country = countryForInput(countryInput, countries)
    if (!country) return { kind: 'unavailable', message: 'That country is no longer available. Please choose another country.' }
    if (!profileResult.data) return { kind: 'error', message: 'Your customer wallet could not be found.' }

    const quote = await fetchFiveSimQuote(baseUrl, country.slug, product)
    if (!quote) return { kind: 'unavailable', message: 'This verification number is no longer available. Please choose another service.' }
    const priceXaf = retailPrice(quote.costUsd * 600, settings.sms_markup_multiplier)
    const balanceXaf = Number(profileResult.data.balance_xaf || 0)
    if (balanceXaf < priceXaf) return { kind: 'insufficient', requiredXaf: priceXaf, balanceXaf }

    const providerResponse = await fetch(`${baseUrl}/user/buy/activation/${encodeURIComponent(country.slug)}/${encodeURIComponent(quote.operator)}/${encodeURIComponent(product)}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(20_000),
    })
    const providerOrder = await providerResponse.json().catch(() => ({})) as ProviderOrder
    if (!providerResponse.ok || !providerOrder.id || !providerOrder.phone) {
      return { kind: 'unavailable', message: providerOrder.error || 'This number was just taken. Please choose another service.' }
    }
    const expiresAt = providerOrder.expires || new Date(Date.now() + 20 * 60 * 1000).toISOString()
    const { data: localOrder, error: orderError } = await admin.from('sms_orders').insert({
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
      await fetch(`${baseUrl}/user/cancel/${encodeURIComponent(String(providerOrder.id))}`, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } }).catch(() => undefined)
      return { kind: 'error', message: 'We could not safely record the order, so no wallet funds were charged.' }
    }
    const { error: transactionError } = await admin.from('wallet_transactions').insert({
      profile_id: profileId,
      amount: priceXaf,
      type: 'sms_purchase',
      payment_method: 'wallet',
      reference: `BOT-SMS-${localOrder.id}`,
      status: 'completed',
      description: `Bot temporary verification number: ${product} in ${country.label}`,
    })
    if (transactionError) {
      await admin.from('sms_orders').delete().eq('id', localOrder.id)
      await fetch(`${baseUrl}/user/cancel/${encodeURIComponent(String(providerOrder.id))}`, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } }).catch(() => undefined)
      return { kind: 'error', message: 'We could not charge the wallet safely, so the number was cancelled.' }
    }
    return { kind: 'success', phone: providerOrder.phone, priceXaf, service: product, country: country.label, expiresAt }
  } catch (error) {
    console.error('[Bot SMS reservation failed]', error)
    return { kind: 'error', message: 'We could not reserve a number right now. No funds were charged.' }
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
      await admin.from('sms_orders').update({ sms_code: code, status: 'received' }).eq('id', order.id)
      await fetch(`${baseUrl}/user/finish/${encodeURIComponent(order.provider_order_id)}`, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } }).catch(() => undefined)
      return { kind: 'received', code }
    }
    if (['CANCELED', 'BANNED', 'FINISHED'].includes(String(provider.status || '').toUpperCase())) {
      await admin.from('sms_orders').update({ status: 'canceled' }).eq('id', order.id)
      return { kind: 'ended', message: 'This verification-number request has ended without a code.' }
    }
    return { kind: 'waiting', expiresAt: provider.expires || order.expires_at }
  } catch (error) {
    console.error('[Bot SMS status check failed]', error)
    return { kind: 'error', message: 'Could not check the SMS code right now.' }
  }
}
