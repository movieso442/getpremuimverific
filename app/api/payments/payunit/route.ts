import { NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'
import { customerUser } from '@/lib/supabase/customer'
import { createAdminClient } from '@/lib/supabase/admin'
import { scheduleAdminNotifications } from '@/lib/notifications/admin-email'
import { getPayunitConfig } from '@/lib/payments/payunit'
import { cameroonPhone, depositXaf, mobileMoneyMethod } from '@/lib/payments/mobile-money'
import { reconcilePayunit, requestMobileMoney } from '@/lib/payments/payunit-direct'
import { topupQuote } from '@/lib/payments/topup-fees'
import { getTopupReference } from '@/lib/payments/minimum'

export const dynamic = 'force-dynamic'
export async function POST(request: Request) {
  try {
    const body = await request.json()
    if (body.accepted_fee_percent !== 0) return NextResponse.json({ error: 'Refresh checkout or update your Android app. MTN and Orange no longer have a platform top-up fee.' }, { status: 409 })
    const user = await customerUser(request)
    if (!user) return NextResponse.json({ error: 'Sign in before adding funds.' }, { status: 401 })
    const admin = createAdminClient()
    const { minimumXaf, usdXafRate } = await getTopupReference(admin)
    const amount = depositXaf(body.amount, body.currency || 'XAF', minimumXaf, usdXafRate)
    const phone = cameroonPhone(body.phone_number)
    if (!amount || !phone || !mobileMoneyMethod(body.payment_method)) return NextResponse.json({ error: `Choose MTN or Orange, enter a Cameroon mobile number, and an amount between ${minimumXaf.toLocaleString()} and 10,000,000 XAF.` }, { status: 400 })
    const { data: profile, error } = await admin.from('profiles').select('id').eq('user_id', user.id).single()
    if (error || !profile) return NextResponse.json({ error: 'Your wallet profile is unavailable.' }, { status: 409 })
    const config = getPayunitConfig()
    if (!config) return NextResponse.json({ error: 'Payments are temporarily unavailable.' }, { status: 503 })
    if (body.idempotency_key && (typeof body.idempotency_key !== 'string' || !/^[a-f0-9-]{36}$/i.test(body.idempotency_key))) return NextResponse.json({ error: 'Invalid payment request ID.' }, { status: 400 })
    const quote = topupQuote(amount, body.payment_method, minimumXaf)
    const reference = `PV${(body.idempotency_key || randomUUID()).replace(/-/g, '')}`
    const { data: reserved, error: insertError } = await admin.rpc('start_wallet_topup', { p_profile: profile.id, p_reference: reference, p_credit: amount, p_method: body.payment_method, p_link: null })
    if (insertError?.code === 'P0001') return NextResponse.json({ error: 'An existing payment is being checked. Check your wallet or contact support before paying again.' }, { status: 409 })
    if (insertError || !reserved) throw insertError || new Error('Payment reservation unavailable')
    if (!reserved.created) return NextResponse.json({ reference: reserved.reference, status: reserved.status, credited: reserved.status === 'completed' })
    scheduleAdminNotifications(admin)
    const result = await requestMobileMoney(config, { amount: quote.totalXaf, phone, method: body.payment_method, reference, returnPath: `/add-funds?ref=${reference}` })
    if (!result.accepted && !result.uncertain) {
      await admin.from('wallet_transactions').update({ status: 'failed' }).eq('reference', reference).eq('status', 'pending')
      scheduleAdminNotifications(admin)
      return NextResponse.json({ error: result.error, reference, status: 'failed' }, { status: 502 })
    }
    return NextResponse.json({ reference, status: 'pending', credited: false, uncertain: Boolean(result.uncertain) }, { status: 202 })
  } catch (error) {
    console.error('[Mobile-money request failed]', error)
    return NextResponse.json({ error: 'Could not start this payment. Check your recent payments before trying again.' }, { status: 502 })
  }
}
export async function GET(request: Request) {
  try {
    const reference = new URL(request.url).searchParams.get('ref')
    if (!reference) return NextResponse.json({ error: 'Payment reference is required.' }, { status: 400 })
    const user = await customerUser(request)
    if (!user) return NextResponse.json({ error: 'Sign in is required.' }, { status: 401 })
    const admin = createAdminClient()
    const { data: profile } = await admin.from('profiles').select('id').eq('user_id', user.id).maybeSingle()
    const { data: transaction } = await admin.from('wallet_transactions').select('id, amount, status, reference, service_fee_xaf').eq('profile_id', profile?.id || '').eq('reference', reference).maybeSingle()
    if (!transaction) return NextResponse.json({ error: 'Payment reference was not found.' }, { status: 404 })
    const status = await reconcilePayunit(admin, transaction)
    if (status === 'completed') scheduleAdminNotifications(admin)
    return NextResponse.json({ status, amount_xaf: Number(transaction.amount), service_fee_xaf: Number(transaction.service_fee_xaf), credited: status === 'completed' }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch { return NextResponse.json({ error: 'Could not confirm this payment yet.' }, { status: 502 }) }
}
