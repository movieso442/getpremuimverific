import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { scheduleAdminNotifications } from '@/lib/notifications/admin-email'
import { getPayunitConfig, type PayunitStatusResponse } from '@/lib/payments/payunit'
import { reconcilePayunit } from '@/lib/payments/payunit-direct'

export const dynamic = 'force-dynamic'
export async function POST(request: Request) {
  try {
    const payload = await request.json() as PayunitStatusResponse
    const reference = payload.data?.transaction_id
    if (typeof reference !== 'string' || reference.length > 100 || !reference) return NextResponse.json({ error: 'Missing payment reference.' }, { status: 400 })
    if (!getPayunitConfig()) return NextResponse.json({ error: 'Payment verification is unavailable.' }, { status: 503 })
    const admin = createAdminClient()
    const { data: transaction, error } = await admin.from('wallet_transactions').select('id,amount,status,reference').eq('reference', reference).eq('type', 'deposit').maybeSingle()
    if (error) throw error
    if (!transaction) return NextResponse.json({ error: 'Unknown payment reference.' }, { status: 404 })
    // Webhook bodies are untrusted. Only the authenticated provider status
    // query can complete a pending ledger entry and trigger a wallet credit.
    const status = await reconcilePayunit(admin, transaction)
    if (status === 'completed' || status === 'failed') scheduleAdminNotifications(admin)
    return NextResponse.json({ received: true, credited: status === 'completed' })
  } catch { return NextResponse.json({ error: 'Payment verification could not complete. Retry this notification.' }, { status: 503 }) }
}
