import { NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { scheduleAdminNotifications } from '@/lib/notifications/admin-email'
import { getPayunitConfig } from '@/lib/payments/payunit'
import { cameroonPhone, mobileMoneyMethod, depositXaf } from '@/lib/payments/mobile-money'
import { reconcilePayunit, requestMobileMoney } from '@/lib/payments/payunit-direct'
import { topupQuote } from '@/lib/payments/topup-fees'
import { getMinimumTopupXaf } from '@/lib/payments/minimum'

export const dynamic = 'force-dynamic'
type BotPaymentLink = { id: string; profile_id: string; amount_xaf: number | string; payment_reference: string | null; expires_at: string }
async function loadLink(token: unknown) {
  if (typeof token !== 'string' || token.length < 32 || token.length > 256) return null
  const { data, error } = await createAdminClient().from('bot_payment_links').select('id,profile_id,amount_xaf,payment_reference,expires_at').eq('token', token).maybeSingle()
  if (error) throw error
  return data && Date.parse(data.expires_at) > Date.now() ? data as BotPaymentLink : null
}
const expired = () => NextResponse.json({ error: 'This secure link has expired. Request a new top-up link from the bot.' }, { status: 404 })
export async function GET(request: Request) {
  try {
    const link = await loadLink(new URL(request.url).searchParams.get('token'))
    if (!link) return expired()
    const admin = createAdminClient()
    const { data: transaction } = link.payment_reference
      ? await admin.from('wallet_transactions').select('id,reference,amount,status,service_fee_xaf').eq('profile_id', link.profile_id).eq('reference', link.payment_reference).maybeSingle()
      : { data: null }
    const { data: claim } = await admin.from('manual_payment_claims').select('status').eq('bot_payment_link_id', link.id).maybeSingle()
    const status = transaction ? await reconcilePayunit(admin, transaction) : claim?.status === 'confirmed' ? 'completed' : claim?.status === 'pending' ? 'manual_pending' : claim?.status || 'ready'
    if (status === 'completed') scheduleAdminNotifications(admin)
    return NextResponse.json({ amount_xaf: Number(link.amount_xaf), service_fee_xaf: transaction ? Number(transaction.service_fee_xaf) : Math.ceil(Number(link.amount_xaf) * 0.02), expires_at: link.expires_at, reference: link.payment_reference, status }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch { return NextResponse.json({ error: 'Could not check this payment yet.' }, { status: 502 }) }
}
export async function POST(request: Request) {
  try {
    const body = await request.json()
    if (body.accepted_fee_percent !== 2) return NextResponse.json({ error: 'Please review and accept the 2% mobile-money top-up fee before continuing.' }, { status: 409 })
    const phone = cameroonPhone(body.phone_number)
    if (!phone || !mobileMoneyMethod(body.payment_method)) return NextResponse.json({ error: 'Choose MTN or Orange and enter your Cameroon mobile number.' }, { status: 400 })
    const link = await loadLink(body.token)
    if (!link) return expired()
    const admin = createAdminClient()
    const minimumXaf = await getMinimumTopupXaf(admin)
    const amount = depositXaf(Number(link.amount_xaf), 'XAF', minimumXaf)
    if (!amount) return NextResponse.json({ error: `Request a new link for at least ${minimumXaf.toLocaleString()} XAF.` }, { status: 400 })
    const config = getPayunitConfig()
    if (!config) return NextResponse.json({ error: 'Payments are temporarily unavailable.' }, { status: 503 })
    const { data: claim } = await admin.from('manual_payment_claims').select('id').eq('bot_payment_link_id', link.id).maybeSingle()
    if (claim) return NextResponse.json({ error: 'This payment is submitted for manual review. Request a new link for another payment.' }, { status: 409 })
    if (link.payment_reference) {
      const { data: existing } = await admin.from('wallet_transactions').select('status').eq('profile_id', link.profile_id).eq('reference', link.payment_reference).maybeSingle()
      return NextResponse.json({ reference: link.payment_reference, status: existing?.status || 'pending', credited: existing?.status === 'completed' })
    }
    const quote = topupQuote(amount, body.payment_method, minimumXaf)
    const reference = 'PVB' + randomUUID().replace(/-/g, '')
    const { data: reserved, error: reservationError } = await admin.rpc('start_wallet_topup', { p_profile: link.profile_id, p_reference: reference, p_credit: amount, p_method: body.payment_method, p_link: link.id })
    if (reservationError?.code === 'P0001') return NextResponse.json({ error: 'An existing payment is being checked. Contact support before paying again.' }, { status: 409 })
    if (reservationError || !reserved) throw reservationError || new Error('Payment reservation unavailable')
    if (!reserved.created) return NextResponse.json({ reference: reserved.reference, status: reserved.status, credited: reserved.status === 'completed' })
    scheduleAdminNotifications(admin)
    const result = await requestMobileMoney(config, { amount: quote.totalXaf, phone, method: body.payment_method, reference, returnPath: '/bot-topup?token=' + encodeURIComponent(body.token) })
    if (!result.accepted && !result.uncertain) {
      await admin.from('wallet_transactions').update({ status: 'failed' }).eq('reference', reference).eq('status', 'pending')
      scheduleAdminNotifications(admin)
      return NextResponse.json({ error: result.error, reference, status: 'failed' }, { status: 502 })
    }
    return NextResponse.json({ reference, status: 'pending', credited: false }, { status: 202 })
  } catch { return NextResponse.json({ error: 'Could not start payment. Check this link again before requesting another payment.' }, { status: 502 }) }
}
