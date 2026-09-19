import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    console.log('[Payunit Webhook Callback Received]:', body)

    // Payunit Webhook Callback parameters
    // Status can be 'SUCCESS', 'FAILED', or 'CANCELLED'
    const status = body.status || body.transaction_status
    const transactionId = body.transaction_id || body.transactionId
    const amount = body.total_amount || body.amount

    if (status === 'SUCCESS' || status === 'SUCCESSFUL') {
      console.log(`[Payunit Webhook] Payment Verified: Transaction ${transactionId} - Amount ${amount} XAF`)
      // Balance update logic can be attached here for persistent databases
    }

    return NextResponse.json({ status: 'SUCCESS', message: 'Payunit webhook processed successfully' })
  } catch (err: any) {
    return NextResponse.json({ error: `Payunit Webhook Error: ${err.message}` }, { status: 400 })
  }
}
