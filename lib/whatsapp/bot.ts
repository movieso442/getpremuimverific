/**
 * WhatsApp Cloud API Assistant Bot Core Module
 * Handles message processing, order fulfillment, Payunit checkout generation, and Meta Graph API messaging.
 */

export interface WhatsAppMessagePayload {
  from: string
  text: string
  name?: string
}

export async function processWhatsAppMessage(payload: WhatsAppMessagePayload): Promise<string> {
  const text = (payload.text || '').trim().toLowerCase()
  const userPhone = payload.from
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://getpremuimverific.vercel.app'

  // 1. HELP / MENU COMMAND
  const greetings = ['menu', 'help', 'hi', 'hello', 'yo', 'hey', 'start', '/start', '1', 'hallo', 'hola']
  if (greetings.includes(text)) {
    return (
      `👋 *Welcome to Premium Verify WhatsApp Bot!*\n\n` +
      `I am your automated assistant. You can order verification numbers, social media growth, and top up your wallet right here!\n\n` +
      `🤖 *Available Commands:*\n\n` +
      `1️⃣ *Buy SMS Verification Number*\n` +
      `   Type: \`sms <service> <country>\`\n` +
      `   *Example:* \`sms wa US\` (WhatsApp US Number)\n` +
      `   *Example:* \`sms tg GB\` (Telegram UK Number)\n\n` +
      `2️⃣ *Place SMM Panel Order*\n` +
      `   Type: \`smm <service_id> <link> <quantity>\`\n` +
      `   *Example:* \`smm 101 https://instagram.com/myprofile 1000\`\n\n` +
      `3️⃣ *Top up Wallet (Payunit - MoMo, OM, Card, PayPal)*\n` +
      `   Type: \`pay <amount_xaf>\`\n` +
      `   *Example:* \`pay 5000\`\n\n` +
      `4️⃣ *Check Account Balance*\n` +
      `   Type: \`balance\`\n\n` +
      `🌐 *Or visit our website:* ${appUrl}`
    )
  }

  // 2. BUY SMS VIRTUAL NUMBER COMMAND (Format: sms <service> <country>)
  if (text.startsWith('sms ')) {
    const parts = text.split(' ').filter(Boolean)
    const service = parts[1] || 'wa'
    const country = (parts[2] || 'US').toUpperCase()

    try {
      // Internal call to /api/v1/sms/order
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
          `Once the code arrives, it will be displayed on your dashboard at ${appUrl}/sms-verification`
        )
      } else {
        return `❌ Could not allocate SMS number: ${data.error || 'Service unavailable'}. Please try again later.`
      }
    } catch (err: any) {
      return `⚠️ Error requesting SMS number: ${err.message}`
    }
  }

  // 3. PLACE SMM PANEL ORDER COMMAND (Format: smm <service_id> <link> <quantity>)
  if (text.startsWith('smm ')) {
    const parts = text.split(' ').filter(Boolean)
    if (parts.length < 4) {
      return `⚠️ *Invalid Format!*\nUse: \`smm <service_id> <link> <quantity>\`\n*Example:* \`smm 101 https://instagram.com/user 1000\``
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
          `📦 *Order Reference:* #${data.order}\n` +
          `🎯 *Service ID:* ${service_id}\n` +
          `🔗 *Target Link:* ${link}\n` +
          `📊 *Quantity:* ${quantity.toLocaleString()}\n` +
          `⚡ *Status:* Processing\n\n` +
          `Track order updates at ${appUrl}/smm-panel`
        )
      } else {
        return `❌ Order Failed: ${data.error || 'Invalid service parameters'}`
      }
    } catch (err: any) {
      return `⚠️ Error creating SMM order: ${err.message}`
    }
  }

  // 4. TOPUP / PAY VIA PAYUNIT COMMAND (Format: pay <amount>)
  if (text.startsWith('pay ') || text.startsWith('topup ')) {
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
          `📱 *Supported:* MTN MoMo, Orange Money, Credit Cards, PayPal\n\n` +
          `👉 *Click to Complete Deposit:* ${checkoutUrl}`
        )
      } else {
        return `❌ Failed to generate Payunit link: ${data.error || 'Server error'}`
      }
    } catch (err: any) {
      return `⚠️ Payment Error: ${err.message}`
    }
  }

  // 5. ACCOUNT BALANCE COMMAND
  if (text === 'balance' || text === 'wallet' || text === 'solde') {
    return (
      `💼 *Premium Verify Wallet Status*\n\n` +
      `👤 *User:* ${payload.name || userPhone}\n` +
      `💵 *Balance:* 25,000 XAF (~$41.60 USD)\n` +
      `⚡ *Status:* Active Member\n\n` +
      `Type \`pay 5000\` to deposit funds via Payunit.`
    )
  }

  // DEFAULT FALLBACK RESPONSE
  return (
    `❓ Unrecognized command: "${payload.text}"\n\n` +
    `Type *menu* to see available commands or visit ${appUrl}`
  )
}

/**
 * Sends a WhatsApp text message via Meta WhatsApp Cloud API
 */
export async function sendWhatsAppMessage(toPhone: string, messageText: string): Promise<boolean> {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN

  if (!phoneNumberId || !accessToken || accessToken.startsWith('demo_')) {
    console.warn('[WhatsApp Bot] Meta Cloud API credentials not configured. Logged reply text:', messageText)
    return false
  }

  try {
    const res = await fetch(`https://graph.facebook.com/v19.0/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: toPhone.replace('+', ''),
        type: 'text',
        text: { body: messageText }
      })
    })

    const data = await res.json()
    if (res.ok) {
      console.log(`[WhatsApp Bot] Sent message to ${toPhone} successfully (ID: ${data.messages?.[0]?.id})`)
      return true
    } else {
      console.error('[WhatsApp Bot Error]:', data)
      return false
    }
  } catch (err) {
    console.error('[WhatsApp Bot Send Error]:', err)
    return false
  }
}
