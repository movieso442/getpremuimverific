import { NextResponse } from 'next/server'
import { customerUser } from '@/lib/supabase/customer'
import { createAdminClient } from '@/lib/supabase/admin'
import { reconcileCard } from '@/lib/payments/payunit-cards'

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
    return json({ available: false, payment: payment ? { ...payment, status } : null })
  } catch { return json({ error: 'Card payment status is temporarily unavailable.' }, 503) }
}
export async function POST() {
  // Retired deliberately. No environment toggle may reactivate old clients.
  // Existing records/webhooks remain available for financial reconciliation.
  return json({ error: 'Card top-ups have been removed. Use MTN MoMo, Orange Money or an available crypto method.' }, 410)
}
