import { NextResponse } from 'next/server'
import { customerUser } from '@/lib/supabase/customer'
import { createAdminClient } from '@/lib/supabase/admin'
import { cardAmount } from '@/lib/payments/cards'
import { cardCheckoutEnabled, initializeCardCheckout, reconcileCard } from '@/lib/payments/payunit-cards'
import { topupQuote } from '@/lib/payments/topup-fees'

export const dynamic = 'force-dynamic'
const uuid = (value: unknown): value is string => typeof value === 'string' && /^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(value)
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } })
async function access(request: Request) {
  const user = await customerUser(request)
  if (!user || !user.email_confirmed_at || user.is_anonymous) return null
  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('id').eq('user_id', user.id).single()
  return profile ? { admin, profile } : null
}
export async function GET(request: Request) {
  try {
    const session = await access(request)
    if (!session) return json({ error: 'Sign in with a verified email to use cards.' }, 401)
    const key = new URL(request.url).searchParams.get('key')
    if (key && !uuid(key)) return json({ error: 'Invalid checkout ID.' }, 400)
    const { admin, profile } = session
    const { error: setupError } = await admin.from('payunit_card_checkouts').select('id').limit(0)
    let query = admin.from('payunit_card_checkouts').select('checkout_url,expires_at,wallet_transactions!inner(reference,amount,status,service_fee_xaf)').eq('profile_id', profile.id)
    if (key) query = query.eq('request_key', key)
    else query = query.eq('wallet_transactions.status', 'pending')
    const { data, error } = await query.order('created_at', { ascending: false }).limit(1).maybeSingle()
    if (error && !setupError) return json({ error: 'Could not check your previous card payment. Do not pay again yet.' }, 503)
    // Supabase relation inference can be an array without generated schema types.
    const payment = data ? (Array.isArray(data.wallet_transactions) ? data.wallet_transactions[0] : data.wallet_transactions) : null
    const status = payment ? await reconcileCard(admin, payment) : null
    return json({ available: cardCheckoutEnabled() && !setupError, payment: payment ? { ...payment, status, checkout_url: data?.checkout_url, expires_at: data?.expires_at } : null })
  } catch { return json({ error: 'Card payment status is temporarily unavailable.' }, 503) }
}
export async function POST(request: Request) {
  try {
    const origin = request.headers.get('origin')
    if (origin && origin !== new URL(request.url).origin) return json({ error: 'Invalid payment origin.' }, 403)
    const session = await access(request)
    if (!session) return json({ error: 'Sign in with a verified email before adding funds.' }, 401)
    if (!cardCheckoutEnabled()) return json({ error: 'Card payments are not enabled yet. Choose another method.' }, 503)
    const body = await request.json()
    if (!cardAmount(body.amount) || !uuid(body.idempotency_key) || body.accepted_fee_percent !== 1.4) return json({ error: 'Choose 3,000–100,000 XAF and accept the 1.4% card top-up fee.' }, 400)
    const { admin, profile } = session
    const { data: reserved, error } = await admin.rpc('reserve_card_topup', { p_profile: profile.id, p_key: body.idempotency_key, p_amount: body.amount })
    if (error) return json({ error: error.code === 'P0001' ? 'Check existing payments and card limits before trying again. Contact support if a payment is stuck.' : 'Card wallet setup is not ready. Choose another method.' }, error.code === 'P0001' ? 409 : 503)
    if (!reserved) return json({ error: 'Could not reserve this payment.' }, 503)
    if (!reserved.created) return json({ ...reserved, checkout_url: new Date(reserved.expires_at).getTime() > Date.now() ? reserved.checkout_url : null, uncertain: !reserved.checkout_url && reserved.status === 'pending' })
    try {
      const checkout = await initializeCardCheckout(reserved.reference, topupQuote(body.amount, 'payunit_card').totalXaf)
      const attached = await admin.rpc('attach_card_checkout', { p_reference: reserved.reference, p_checkout: checkout.checkoutId, p_url: checkout.url })
      if (attached.error) throw new Error('Could not save checkout')
      return json({ reference: reserved.reference, status: 'pending', checkout_url: checkout.url }, 201)
    } catch {
      // The provider may have created a checkout even if its response was lost.
      // Never repeat initialization, fail the ledger, or release the reservation here.
      return json({ reference: reserved.reference, status: 'pending', uncertain: true, message: 'We could not confirm checkout creation. Do not start another payment; contact support with this reference.' }, 202)
    }
  } catch { return json({ error: 'Could not start checkout. Check your previous payment before trying again.' }, 503) }
}
