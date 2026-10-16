import { NextResponse } from 'next/server'
// New top-ups use the verified operator prompt or the atomic crypto flow.
// Keep historical manual claims reviewable, but do not accept new unverified
// mobile-money receipt claims through the retired duplicate checkout path.
export async function POST() {
  return NextResponse.json({ error: 'Use MTN MoMo or Orange Money in checkout. For other arrangements, contact support at +237 640 796 062.' }, { status: 410 })
}
