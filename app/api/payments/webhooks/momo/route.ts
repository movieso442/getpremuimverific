import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  return NextResponse.json({ error: 'Direct MoMo callbacks are disabled. Payunit verifies wallet deposits.' }, { status: 410 })
}
