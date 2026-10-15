import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { reconcileCard } from '@/lib/payments/payunit-cards'
import { cardReference } from '@/lib/payments/cards'
import { scheduleAdminNotifications } from '@/lib/notifications/admin-email'

export async function POST(request: Request) {
  try {
    const payload = await request.json()
    const admin = createAdminClient()
    const checkoutId = payload?.data?.checkout_id ?? payload?.checkout_id
    const reference = payload?.data?.transaction_id ?? payload?.transaction_id
    let query = admin.from('wallet_transactions').select('reference,amount,service_fee_xaf,status').eq('payment_method', 'payunit_card').eq('type', 'deposit')
    if (typeof checkoutId === 'string' && /^PU_LIVE_[a-f0-9-]{36}$/i.test(checkoutId)) {
      const { data } = await admin.from('payunit_card_checkouts').select('transaction_id').eq('checkout_id', checkoutId).maybeSingle()
      if (!data) return NextResponse.json({ received: true })
      query = query.eq('id', data.transaction_id)
    } else if (cardReference(reference)) query = query.eq('reference', reference)
    else return NextResponse.json({ error: 'Missing checkout reference.' }, { status: 400 })
    const { data: payment, error } = await query.maybeSingle()
    if (error) throw error
    if (!payment) return NextResponse.json({ received: true })
    // Payloads are hints only. Credit requires an authenticated provider GET
    // matching the stored live checkout, merchant reference, XAF and gross total.
    const status = await reconcileCard(admin, payment)
    if (status === 'completed' || status === 'failed') scheduleAdminNotifications(admin)
    return NextResponse.json({ received: true })
  } catch { return NextResponse.json({ error: 'Verification unavailable; retry notification.' }, { status: 503 }) }
}
