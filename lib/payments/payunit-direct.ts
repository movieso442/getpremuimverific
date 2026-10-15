import type { SupabaseClient } from '@supabase/supabase-js'
import { getPayunitConfig, getPayunitPaymentStatus } from './payunit'
import type { MobileMoneyMethod } from './mobile-money'
import { cardReference } from './cards'
import { reconcileCard } from './payunit-cards'
type Config = NonNullable<ReturnType<typeof getPayunitConfig>>
type Result = { accepted: boolean; uncertain?: boolean; error?: string }

/** No PIN/card data or checkout URLs leave this server-side integration. */
export async function requestMobileMoney(config: Config, input: { amount: number; reference: string; phone: string; method: MobileMoneyMethod; returnPath: string }): Promise<Result> {
  const common = { currency: 'XAF', transaction_id: input.reference, return_url: `${config.appUrl}${input.returnPath}`, notify_url: `${config.appUrl}/api/payments/webhooks/payunit` }
  try {
    const init = await fetch(`${config.baseUrl}/api/gateway/initialize`, { method: 'POST', headers: config.headers, signal: AbortSignal.timeout(20_000),
      body: JSON.stringify({ ...common, total_amount: input.amount, app_id: config.appId, payment_country: 'CM', description: 'Premium Verific wallet top-up' }) })
    const initialized = await init.json().catch(() => ({}))
    if (!init.ok || initialized.status !== 'SUCCESS') return { accepted: false, error: 'The payment service could not start this payment. Please try again later.' }
    const response = await fetch(`${config.baseUrl}/api/gateway/makepayment`, { method: 'POST', headers: config.headers, signal: AbortSignal.timeout(20_000),
      body: JSON.stringify({ ...common, amount: input.amount, phone_number: input.phone, gateway: input.method === 'mtn_momo' ? 'CM_MTNMOMO' : 'CM_ORANGE', paymentType: 'button' }) })
    const result = await response.json().catch(() => ({}))
    if (response.ok && result.status === 'SUCCESS') return { accepted: true }
    // A timeout/server error may happen after the operator receives a request.
    // Never retry automatically or claim that a real transfer definitely failed.
    if (response.status >= 500 || !result.status) return { accepted: false, uncertain: true }
    return { accepted: false, error: 'The mobile-money request was declined. Check your operator and phone number.' }
  } catch { return { accepted: false, uncertain: true } }
}

export async function reconcilePayunit(admin: SupabaseClient, transaction: { id: string; reference: string; amount: number | string; status: string; service_fee_xaf?: number | string }) {
  if (cardReference(transaction.reference)) return reconcileCard(admin, { ...transaction, service_fee_xaf: transaction.service_fee_xaf ?? NaN })
  if (transaction.status === 'completed') return 'completed'
  const config = getPayunitConfig()
  if (!config || transaction.status !== 'pending') return transaction.status
  const { response, payload } = await getPayunitPaymentStatus(transaction.reference, config)
  const verified = response.ok && payload.status === 'SUCCESS'
    && payload.data?.transaction_id === transaction.reference && payload.data.transaction_currency === 'XAF'
    && Number(payload.data.transaction_amount) === Number(transaction.amount) + Number(transaction.service_fee_xaf ?? 0)
  if (!verified) return transaction.status
  const next = payload.data?.transaction_status === 'SUCCESS' ? 'completed'
    : ['FAILED', 'CANCELLED'].includes(payload.data?.transaction_status || '') ? 'failed' : null
  if (!next) return transaction.status
  const { data, error } = await admin.from('wallet_transactions').update({ status: next }).eq('id', transaction.id).eq('status', 'pending').select('status').maybeSingle()
  if (error) throw error
  if (data) return data.status
  const { data: current, error: readError } = await admin.from('wallet_transactions').select('status').eq('id', transaction.id).single()
  if (readError) throw readError
  return current.status as string
}
