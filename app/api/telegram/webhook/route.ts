import { NextResponse } from 'next/server'
import { processTelegramMessage, sendTelegramMessage } from '@/lib/telegram/bot'

export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json({ status: 'Telegram Bot Webhook Endpoint Active (@getpremuimverific_bot)' })
}

export async function POST(request: Request) {
  try {
    const update = await request.json()

    const msg = update.message || update.callback_query?.message
    const callbackData = typeof update.callback_query?.data === 'string' ? update.callback_query.data : ''
    if (msg) {
      const chatId = msg.chat?.id
      const text = callbackData || msg.text || ''
      const sender = update.callback_query?.from || msg.from
      const fromName = sender?.first_name ? `${sender.first_name} ${sender.last_name || ''}`.trim() : 'User'

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
        if (update.callback_query?.id && process.env.TELEGRAM_BOT_TOKEN) {
          await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ callback_query_id: update.callback_query.id }),
          }).catch(() => undefined)
        }
      }
    }

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('[Telegram Webhook Error]:', err)
    return NextResponse.json({ error: err.message || 'Telegram webhook error' }, { status: 500 })
  }
}
