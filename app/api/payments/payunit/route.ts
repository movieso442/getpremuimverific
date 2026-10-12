import { NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'
import { customerUser } from '@/lib/supabase/customer'
import { createAdminClient } from '@/lib/supabase/admin'
import { scheduleAdminNotifications } from '@/lib/notifications/admin-email'
import { getPayunitConfig } from '@/lib/payments/payunit'
import { cameroonPhone, depositXaf, mobileMoneyMethod } from '@/lib/payments/mobile-money'
import { reconcilePayunit, requestMobileMoney } from '@/lib/payments/payunit-direct'

export const dynamic = 'force-dynamic'
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const amount = depositXaf(body.amount, body.currency || 'XAF')
    const phone = cameroonPhone(body.phone_number)
    if (!amount || !phone || !mobileMoneyMethod(body.payment_method)) return NextResponse.json({ error: 'Choose MTN or Orange, enter a Cameroon mobile number, and an amount between 3,000 and 10,000,000 XAF.' }, { status: 400 })
    const user = await customerUser(request)
    if (!user) return NextResponse.json({ error: 'Sign in before adding funds.' }, { status: 401 })
    const admin = createAdminClient()
    const { data: profile, error } = await admin.from('profiles').select('id').eq('user_id', user.id).single()
    if (error || !profile) return NextResponse.json({ error: 'Your wallet profile is unavailable.' }, { status: 409 })
    const config = getPayunitConfig()
    if (!config) return NextResponse.json({ error: 'Payments are temporarily unavailable.' }, { status: 503 })
    if (body.idempotency_key && (typeof body.idempotency_key !== 'string' || !/^[a-f0-9-]{36}$/i.test(body.idempotency_key))) return NextResponse.json({ error: 'Invalid payment request ID.' }, { status: 400 })
    const reference = `PV${(body.idempotency_key || randomUUID()).replace(/-/g, '')}`
    const { error: insertError } = await admin.from('wallet_transactions').insert({ profile_id: profile.id, amount, type: 'deposit', payment_method: body.payment_method,
      reference, status: 'pending', description: 'Mobile-money wallet top-up awaiting verified payment' })
    if (insertError) {
      if (insertError.code !== '23505') throw insertError
      const { data: existing } = await admin.from('wallet_transactions').select('amount, status, payment_method').eq('profile_id', profile.id).eq('reference', reference).single()
      if (!existing || Number(existing.amount) !== amount || existing.payment_method !== body.payment_method) return NextResponse.json({ error: 'This payment request ID has already been used.' }, { status: 409 })
      return NextResponse.json({ reference, status: existing.status, credited: existing.status === 'completed' })
    }
    scheduleAdminNotifications(admin)
    const result = await requestMobileMoney(config, { amount, phone, method: body.payment_method, reference, returnPath: `/add-funds?ref=${reference}` })
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
    const { data: transaction } = await admin.from('wallet_transactions').select('id, amount, status, reference').eq('profile_id', profile?.id || '').eq('reference', reference).maybeSingle()
    if (!transaction) return NextResponse.json({ error: 'Payment reference was not found.' }, { status: 404 })
    const status = await reconcilePayunit(admin, transaction)
    if (status === 'completed') scheduleAdminNotifications(admin)
    return NextResponse.json({ status, amount_xaf: Number(transaction.amount), credited: status === 'completed' }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch { return NextResponse.json({ error: 'Could not confirm this payment yet.' }, { status: 502 }) }
}
