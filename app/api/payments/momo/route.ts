import { NextResponse } from 'next/server'

// Legacy endpoint retained only to make old clients fail safely. All wallet
// top-ups now use /api/payments/payunit with server-side verification.
export async function POST() {
  return NextResponse.json({
    error: 'This payment endpoint has been retired. Please use the Payunit checkout.',
  }, { status: 410 })
}
