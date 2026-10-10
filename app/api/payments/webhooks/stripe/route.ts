import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  return NextResponse.json({ error: 'Stripe payments are disabled.' }, { status: 410 })
}
