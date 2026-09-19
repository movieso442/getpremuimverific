import { NextResponse } from 'next/server'
import { processWhatsAppMessage, sendWhatsAppMessage } from '@/lib/whatsapp/bot'

export const dynamic = 'force-dynamic'

// Meta WhatsApp Webhook GET Verification Challenge
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || 'pv_wa_secure_token_2026'

  if (mode && token) {
    if (mode === 'subscribe' && token === verifyToken) {
      console.log('[WhatsApp Webhook Verified Successfully]')
      return new Response(challenge, { status: 200 })
    } else {
      return new Response('Verification failed - Token mismatch', { status: 403 })
    }
  }

  return NextResponse.json({ status: 'WhatsApp Webhook Listener Active' })
}

// Meta WhatsApp Webhook POST Incoming Message Handler
export async function POST(request: Request) {
  try {
    const body = await request.json()

    // Inspect if webhook contains a WhatsApp message event
    if (body.object === 'whatsapp_business_account' || body.entry) {
      const entry = body.entry?.[0]
      const changes = entry?.changes?.[0]
      const value = changes?.value
      const messages = value?.messages

      if (messages && messages.length > 0) {
        const msg = messages[0]
        const fromPhone = msg.from
        const messageText = msg.text?.body || msg.caption || ''
        const contactName = value.contacts?.[0]?.profile?.name || fromPhone

        console.log(`[WhatsApp Webhook] Incoming message from ${contactName} (${fromPhone}): "${messageText}"`)

        // Process message through bot engine
        const replyText = await processWhatsAppMessage({
          from: fromPhone,
          text: messageText,
          name: contactName
        })

        // Dispatch reply back to user on WhatsApp
        await sendWhatsAppMessage(fromPhone, replyText)
      }
    }

    return NextResponse.json({ status: 'EVENT_RECEIVED' })
  } catch (err: any) {
    console.error('[WhatsApp Webhook Error]:', err)
    return NextResponse.json({ error: err.message || 'Webhook processing failed' }, { status: 500 })
  }
}
