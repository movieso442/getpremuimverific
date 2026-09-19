import { NextResponse } from 'next/server'
import { processTelegramMessage, sendTelegramMessage } from '@/lib/telegram/bot'

export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json({ status: 'Telegram Bot Webhook Endpoint Active (@getpremuimverific_bot)' })
}

export async function POST(request: Request) {
  try {
    const update = await request.json()

    if (update.message) {
      const msg = update.message
      const chatId = msg.chat?.id
      const text = msg.text || ''
      const fromName = msg.from?.first_name ? `${msg.from.first_name} ${msg.from.last_name || ''}`.trim() : 'User'

      if (chatId && text) {
        console.log(`[Telegram Webhook] Incoming message from ${fromName} (${chatId}): "${text}"`)

        // Process message through Telegram bot engine
        const replyText = await processTelegramMessage({
          chatId,
          text,
          fromName
        })

        // Dispatch reply back to Telegram user
        await sendTelegramMessage(chatId, replyText)
      }
    }

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('[Telegram Webhook Error]:', err)
    return NextResponse.json({ error: err.message || 'Telegram webhook error' }, { status: 500 })
  }
}
