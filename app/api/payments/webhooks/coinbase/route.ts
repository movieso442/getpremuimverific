import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const rawBody = await request.text()
    const signature = request.headers.get('x-cc-webhook-signature')
    const webhookSecret = process.env.COINBASE_WEBHOOK_SECRET

    const payload = JSON.parse(rawBody)
    const event = payload.event

    if (event && (event.type === 'charge:confirmed' || event.type === 'charge:resolved')) {
      const charge = event.data
      const amountUsd = charge.pricing?.local?.amount
      const cryptoAsset = charge.payments?.[0]?.crypto_currency || 'Crypto'

      console.log(`[Coinbase Webhook] Crypto Deposit Confirmed: $${amountUsd} USD via ${cryptoAsset} (Code: ${charge.code})`)
      // Database wallet balance credit logic can be hooked here
    }

    return NextResponse.json({ received: true })
  } catch (err: any) {
    return NextResponse.json({ error: `Coinbase Webhook Error: ${err.message}` }, { status: 400 })
  }
}
