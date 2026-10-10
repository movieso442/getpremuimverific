import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  return NextResponse.json({ error: 'This legacy endpoint is retired. Payment status is verified at /api/payments/payunit.' }, { status: 410 })
}
