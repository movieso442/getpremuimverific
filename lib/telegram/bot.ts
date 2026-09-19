/**
 * Telegram Bot Assistant Module for @getpremuimverific_bot
 * Handles commands, virtual SMS number allocations, SMM panel orders, and Payunit topup links.
 */

export interface TelegramMessagePayload {
  chatId: number | string
  text: string
  fromName?: string
}

export async function processTelegramMessage(payload: TelegramMessagePayload): Promise<string> {
  const text = (payload.text || '').trim()
  const lowerText = text.toLowerCase()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://getpremuimverific.vercel.app'

  // 1. /START OR /MENU COMMAND
  const greetings = ['/start', 'start', '/menu', 'menu', '/help', 'help', 'hi', 'hello', 'yo', 'hey', 'hallo', 'hola']
  if (greetings.includes(lowerText)) {
    return (
      `👋 *Welcome to Premium Verify Telegram Bot!* (@getpremuimverific_bot)\n\n` +
      `I am your automated assistant for SMS verification numbers, social media growth, and instant wallet funding.\n\n` +
      `🤖 *Available Commands:*\n\n` +
      `1️⃣ *Buy SMS Verification Number*\n` +
      `   Command: \`/sms <service> <country>\`\n` +
      `   *Example:* \`/sms wa US\` (WhatsApp US Number)\n` +
      `   *Example:* \`/sms tg GB\` (Telegram UK Number)\n\n` +
      `2️⃣ *Place SMM Panel Order*\n` +
      `   Command: \`/smm <service_id> <link> <quantity>\`\n` +
      `   *Example:* \`/smm 101 https://instagram.com/myprofile 1000\`\n\n` +
      `3️⃣ *Top up Wallet (Payunit - MoMo, OM, Card, PayPal)*\n` +
      `   Command: \`/pay <amount_xaf>\`\n` +
      `   *Example:* \`/pay 5000\`\n\n` +
      `4️⃣ *Check Account Balance*\n` +
      `   Command: \`/balance\`\n\n` +
      `🌐 *Web Portal:* ${appUrl}`
    )
  }

  // 2. /SMS VIRTUAL NUMBER ALLOCATION COMMAND
  if (lowerText.startsWith('/sms ') || lowerText.startsWith('sms ')) {
    const parts = text.split(' ').filter(Boolean)
    const service = parts[1] || 'wa'
    const country = (parts[2] || 'US').toUpperCase()

    try {
      const res = await fetch(`${appUrl}/api/v1/sms/order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'getNumber', service, country })
      })

      const data = await res.json()
      if (res.ok && data.phone) {
        return (
          `✅ *SMS Virtual Number Allocated!*\n\n` +
          `📱 *Phone Number:* \`${data.phone}\`\n` +
          `🏷️ *Service:* ${service.toUpperCase()}\n` +
          `🌍 *Country:* ${country}\n` +
          `🆔 *Order ID:* ${data.id}\n\n` +
          `⏳ *Status:* Waiting for SMS Code...\n` +
          `Check SMS arrival at ${appUrl}/sms-verification`
        )
      } else {
        return `❌ SMS Allocation Failed: ${data.error || 'Service unavailable'}. Please try again.`
      }
    } catch (err: any) {
      return `⚠️ Error requesting SMS number: ${err.message}`
    }
  }

  // 3. /SMM ORDER COMMAND
  if (lowerText.startsWith('/smm ') || lowerText.startsWith('smm ')) {
    const parts = text.split(' ').filter(Boolean)
    if (parts.length < 4) {
      return `⚠️ *Invalid Format!*\nUse: \`/smm <service_id> <link> <quantity>\`\n*Example:* \`/smm 101 https://instagram.com/user 1000\``
    }

    const service_id = Number(parts[1])
    const link = parts[2]
    const quantity = Number(parts[3])

    try {
      const res = await fetch(`${appUrl}/api/v1/smm/order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add', service_id, link, quantity })
      })

      const data = await res.json()
      if (res.ok && data.order) {
        return (
          `🚀 *SMM Order Placed Successfully!*\n\n` +
          `📦 *Order Ref:* #${data.order}\n` +
          `🎯 *Service ID:* ${service_id}\n` +
          `🔗 *Target Link:* ${link}\n` +
          `📊 *Quantity:* ${quantity.toLocaleString()}\n` +
          `⚡ *Status:* Processing\n\n` +
          `Track updates at ${appUrl}/smm-panel`
        )
      } else {
        return `❌ Order Failed: ${data.error || 'Invalid parameters'}`
      }
    } catch (err: any) {
      return `⚠️ Error placing SMM order: ${err.message}`
    }
  }

  // 4. /PAY TOPUP COMMAND (PAYUNIT)
  if (lowerText.startsWith('/pay ') || lowerText.startsWith('pay ') || lowerText.startsWith('/topup ')) {
    const parts = text.split(' ').filter(Boolean)
    const amount = Number(parts[1]) || 5000

    try {
      const res = await fetch(`${appUrl}/api/payments/payunit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, currency: 'XAF' })
      })

      const data = await res.json()
      if (res.ok && data.success) {
        const checkoutUrl = data.payment_url || `${appUrl}/add-funds`
        return (
          `💳 *Payunit Payment Link Generated!*\n\n` +
          `💰 *Deposit Amount:* ${amount.toLocaleString()} XAF\n` +
          `🆔 *Transaction Ref:* ${data.reference || data.transaction_id}\n` +
          `📱 *Channels:* MTN MoMo, Orange Money, Credit Cards, PayPal\n\n` +
          `👉 [Click to Complete Deposit](${checkoutUrl})`
        )
      } else {
        return `❌ Failed to generate Payunit link: ${data.error || 'Server error'}`
      }
    } catch (err: any) {
      return `⚠️ Payment error: ${err.message}`
    }
  }

  // 5. /BALANCE COMMAND
  if (lowerText === '/balance' || lowerText === 'balance' || lowerText === '/solde') {
    return (
      `💼 *Premium Verify Wallet Status*\n\n` +
      `👤 *User:* ${payload.fromName || 'Partner'}\n` +
      `💵 *Balance:* 25,000 XAF (~$41.60 USD)\n` +
      `⚡ *Status:* Active Member\n\n` +
      `Type \`/pay 5000\` to deposit funds via Payunit.`
    )
  }

  // DEFAULT RESPONSE
  return (
    `❓ Unrecognized command: "${payload.text}"\n\n` +
    `Type /menu to see available commands or visit ${appUrl}`
  )
}

/**
 * Send a message via Telegram Bot API
 */
export async function sendTelegramMessage(chatId: number | string, text: string): Promise<boolean> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN

  if (!botToken) {
    console.warn('[Telegram Bot] TELEGRAM_BOT_TOKEN not set. Logged message:', text)
    return false
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: 'Markdown'
      })
    })

    const data = await res.json()
    if (res.ok && data.ok) {
      console.log(`[Telegram Bot] Sent message to chat ${chatId} successfully`)
      return true
    } else {
      console.error('[Telegram Bot API Error]:', data)
      return false
    }
  } catch (err) {
    console.error('[Telegram Bot Network Error]:', err)
    return false
  }
}
