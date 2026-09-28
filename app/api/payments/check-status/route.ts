import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const ref = searchParams.get('ref')
    const action = searchParams.get('action') // 'verify' to simulate PIN entry validation

    if (!ref) {
      return NextResponse.json({ error: 'Transaction reference is required' }, { status: 400 })
    }

    // A browser-provided PIN/amount is not proof of payment. Wallet credits must come
    // only from a verified payment-provider webhook, never from this status endpoint.
    if (action === 'verify') {
      return NextResponse.json({
        error: 'Local PIN verification is disabled in live mode. Wait for the verified payment-provider webhook before crediting a wallet.'
      }, { status: 403 })
    }

    return NextResponse.json({
      success: true,
      status: 'PENDING',
      reference: ref,
      message: 'Waiting for Mobile Money PIN entry authorization on user phone...'
    })

  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error checking payment status' }, { status: 500 })
  }
}
