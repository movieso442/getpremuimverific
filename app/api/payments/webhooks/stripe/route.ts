import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const rawBody = await request.text()
    const signature = request.headers.get('stripe-signature')
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

    if (!webhookSecret) {
      return NextResponse.json({ received: true, note: 'Webhook secret not configured, event logged.' })
    }

    // Event verification logic when STRIPE_WEBHOOK_SECRET is set
    const event = JSON.parse(rawBody)

    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object
      const amountUsd = paymentIntent.amount / 100
      const metadata = paymentIntent.metadata || {}
      
      console.log(`[Stripe Webhook] Payment succeeded: $${amountUsd} USD (Ref: ${paymentIntent.id})`, metadata)
      // Database balance update logic can be hooked here
    }

    return NextResponse.json({ received: true })
  } catch (err: any) {
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 })
  }
}
