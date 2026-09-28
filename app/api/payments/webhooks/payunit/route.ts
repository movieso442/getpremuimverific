import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

type PayunitStatusResponse = {
  status?: string
  data?: { transaction_id?: string; transaction_status?: string; transaction_amount?: number; transaction_currency?: string }
}

export async function POST(request: Request) {
  try {
    const payload = await request.json() as PayunitStatusResponse
    const transactionId = payload.data?.transaction_id
    if (!transactionId) return NextResponse.json({ error: 'Missing Payunit transaction ID.' }, { status: 400 })

    const appId = process.env.PAYUNIT_APP_ID
    const apiUser = process.env.PAYUNIT_API_USER
    const apiPassword = process.env.PAYUNIT_API_PASSWORD
    const mode = process.env.PAYUNIT_MODE || 'live'
    const apiKey = mode === 'live' ? process.env.PAYUNIT_LIVE_KEY : process.env.PAYUNIT_API_KEY
    if (!appId || !apiUser || !apiPassword || !apiKey) return NextResponse.json({ error: 'Payunit verification is not configured.' }, { status: 503 })

    const baseUrl = mode === 'live' ? 'https://gateway.payunit.net' : 'https://sandbox.payunit.net'
    const statusResponse = await fetch(`${baseUrl}/api/gateway/paymentstatus/${encodeURIComponent(transactionId)}`, {
      headers: {
        'x-api-key': apiKey, mode, 'Content-Type': 'application/json',
        Authorization: `Basic ${Buffer.from(`${apiUser}:${apiPassword}`).toString('base64')}`,
      }, signal: AbortSignal.timeout(20_000),
    })
    const verified = await statusResponse.json().catch(() => ({})) as PayunitStatusResponse
    if (!statusResponse.ok || verified.status !== 'SUCCESS' || verified.data?.transaction_status !== 'SUCCESS')
      return NextResponse.json({ received: true, credited: false })
    if (verified.data.transaction_currency !== 'XAF' || !Number.isFinite(Number(verified.data.transaction_amount)))
      return NextResponse.json({ error: 'Invalid verified payment currency or amount.' }, { status: 400 })

    const admin = createAdminClient()
    const { data: transaction, error: transactionError } = await admin.from('wallet_transactions')
      .select('id, amount, status').eq('reference', transactionId).maybeSingle()
    if (transactionError || !transaction) return NextResponse.json({ error: 'Unknown payment reference.' }, { status: 404 })
    if (Number(transaction.amount) !== Number(verified.data.transaction_amount))
      return NextResponse.json({ error: 'Verified payment amount does not match the expected amount.' }, { status: 400 })

    if (transaction.status === 'pending') {
      const { error: updateError } = await admin.from('wallet_transactions').update({ status: 'completed' }).eq('id', transaction.id).eq('status', 'pending')
      if (updateError) throw updateError
    }
    return NextResponse.json({ received: true, credited: true })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Payunit webhook processing failed'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
