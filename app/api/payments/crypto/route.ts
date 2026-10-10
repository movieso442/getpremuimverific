import { NextResponse } from 'next/server'
/** Crypto checkout is intentionally unavailable until its provider webhook has
 * exact amount/reference verification and a ledger credit implementation. */
export async function POST() {
  return NextResponse.json({ error: 'Crypto payments are not available. Use the verified Payunit checkout.' }, { status: 410 })
}
