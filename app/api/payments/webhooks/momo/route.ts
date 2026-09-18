import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    console.log('[Mobile Money Webhook] Callback received:', body)

    // Handle Africa's Talking payment callback format
    if (body.transactionId && body.status === 'Success') {
      console.log(`[Africa's Talking Callback] Payment Success: ${body.category} - ${body.value} (Phone: ${body.phoneNumber})`)
    }

    // Handle Hubtel Ghana callback format
    if (body.ResponseCode === '0000' || body.status === 'Success') {
      console.log(`[Hubtel Callback] Payment Success: Ref ${body.ClientReference || body.Data?.ClientReference}`)
    }

    return NextResponse.json({ status: 'SUCCESS', message: 'Callback received successfully' })
  } catch (err: any) {
    return NextResponse.json({ error: `MoMo Webhook Error: ${err.message}` }, { status: 400 })
  }
}
