import { NextResponse } from 'next/server'
/** Stripe is disabled until its signed webhook can safely credit the wallet. */
export async function POST() {
  return NextResponse.json({ error: 'Card payments are not available. Use the verified Payunit checkout.' }, { status: 410 })
}
