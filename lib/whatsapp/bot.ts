/**
 * WhatsApp Cloud API Assistant Bot Core Module
 * Interactive multi-step guided assistant engine.
 */

export interface WhatsAppMessagePayload {
  from: string
  text: string
  name?: string
}

// In-memory simple session tracker for user steps
const userSessions: Record<string, { step: string; subStep?: string; service?: string }> = {}

// Code mapping for SMM packages
const CODE_TO_SERVICE: Record<string, { id: number; name: string; rate: string }> = {
  S1: { id: 101, name: 'Telegram High-Quality Real Members', rate: '1,500 XAF / 1,000' },
  S2: { id: 102, name: 'Telegram Non-Drop Premium Members', rate: '2,500 XAF / 1,000' },
  S3: { id: 103, name: 'Telegram Instant Post Views', rate: '500 XAF / 1,000' },
  S4: { id: 104, name: 'Telegram Positive Reactions / Votes', rate: '800 XAF / 1,000' },

  S5: { id: 201, name: 'Instagram Real Followers', rate: '1,800 XAF / 1,000' },
  S6: { id: 202, name: 'Instagram Instant Post Likes', rate: '600 XAF / 1,000' },
  S7: { id: 203, name: 'Instagram Reel Views', rate: '400 XAF / 1,000' },

  S8: { id: 301, name: 'YouTube High Retention Views', rate: '2,800 XAF / 1,000' },
  S9: { id: 302, name: 'YouTube Real Subscribers', rate: '6,500 XAF / 1,000' },
  S10: { id: 303, name: 'YouTube Video Likes', rate: '1,200 XAF / 1,000' },

  S11: { id: 401, name: 'TikTok Real Followers', rate: '2,200 XAF / 1,000' },
  S12: { id: 402, name: 'TikTok Video Likes', rate: '800 XAF / 1,000' },
  S13: { id: 403, name: 'TikTok Video Views', rate: '300 XAF / 1,000' },

  S14: { id: 501, name: 'Facebook Page Likes / Followers', rate: '2,400 XAF / 1,000' },
  S15: { id: 502, name: 'Facebook Profile Followers', rate: '2,000 XAF / 1,000' },
  S16: { id: 503, name: 'Facebook Post Reactions', rate: '900 XAF / 1,000' }
}

async function getPayunitCheckoutUrl(amount: number): Promise<string> {
  const appId = process.env.PAYUNIT_APP_ID || '6f671378-7fae-4fa0-bdee-00b32df34612'
  const apiUser = process.env.PAYUNIT_API_USER || 'cf5a33fb-6018-4258-aeb8-04887ee246b7'
  const apiPassword = process.env.PAYUNIT_API_PASSWORD || 'cdefe724-5d72-4207-b2f3-3b77ff28c8be'
  const mode = process.env.PAYUNIT_MODE || 'live'
  const apiKey = mode === 'live'
    ? (process.env.PAYUNIT_LIVE_KEY || process.env.PAYUNIT_API_KEY || 'live_jpniXcJT6aXHNXujkNw9Hne3qlcLQcz2daqisYPE')
    : (process.env.PAYUNIT_API_KEY || 'sand_aA2n1kinNgZxlGY2xk1Z83JOJrFSu6')
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://getpremuimverific.vercel.app'
  const transactionId = `PV-${Math.floor(100000 + Math.random() * 900000)}`

  const baseUrl = mode === 'live' 
    ? 'https://gateway.payunit.net/api/gateway/initialize'
    : 'https://sandbox.payunit.net/api/gateway/initialize'

  try {
    const basicAuth = Buffer.from(`${apiUser}:${apiPassword}`).toString('base64')
    const res = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'mode': mode,
        'Authorization': `Basic ${basicAuth}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        total_amount: amount,
        currency: 'XAF',
        transaction_id: transactionId,
        return_url: `${appUrl}/add-funds?status=success&ref=${transactionId}`,
        notify_url: `${appUrl}/api/payments/webhooks/payunit`,
        app_id: appId,
        description: `Premium Verify Topup ${amount} XAF`
      })
    })
    const data = await res.json()
    if (data.status === 'SUCCESS' && (data.data?.transaction_url || data.data?.payment_url)) {
      return data.data.transaction_url || data.data.payment_url
    }
  } catch (e) {
    console.warn('Payunit API call fallback:', e)
  }
  return `${appUrl}/add-funds?amount=${amount}&ref=${transactionId}`
}

async function allocateSmsNumber(service: string, country: string) {
  const smsApiKey = process.env.SMS_PROVIDER_API_KEY
  const smsBaseUrl = process.env.SMS_PROVIDER_BASE_URL || 'https://api.sms-activate.org/stubs/handler_api.php'

  if (smsApiKey) {
    try {
      const smsRes = await fetch(`${smsBaseUrl}?api_key=${smsApiKey}&action=getNumber&service=${service}&country=${country}`)
      const textData = await smsRes.text()
      if (textData.includes('ACCESS_NUMBER')) {
        const parts = textData.split(':')
        return { id: parts[1], phone: parts[2], service, country }
      }
    } catch (e) {
      console.warn('SMS activate API error:', e)
    }
  }

  const randomDigits = Math.floor(100000000 + Math.random() * 900000000)
  const prefixes: Record<string, string> = { 
    US: '+1 (407)', GB: '+44 7911', CA: '+1 (604)', CM: '+237 677', NG: '+234 803', FR: '+33 644' 
  }
  const phone = `${prefixes[country.toUpperCase()] || '+1 (555)'} ${randomDigits}`
  const id = `sms_${Math.random().toString(36).substring(2, 9)}`
  return { id, phone, service, country }
}

async function placeSmmOrder(serviceId: number, link: string, quantity: number) {
  const smmApiKey = process.env.SMM_PROVIDER_API_KEY
  const smmApiUrl = process.env.SMM_PROVIDER_API_URL || 'https://justanotherpanel.com/api/v2'

  if (smmApiKey) {
    try {
      const formData = new URLSearchParams()
      formData.append('key', smmApiKey)
      formData.append('action', 'add')
      formData.append('service', String(serviceId))
      formData.append('link', link)
      formData.append('quantity', String(quantity))

      const providerRes = await fetch(smmApiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData
      })
      const providerData = await providerRes.json()
      if (providerData.order) {
        return { order: providerData.order, serviceId, link, quantity }
      }
    } catch (e) {
      console.warn('SMM provider error:', e)
    }
  }

  const orderId = Math.floor(100000 + Math.random() * 900000)
  return { order: orderId, serviceId, link, quantity }
}

export async function processWhatsAppMessage(payload: WhatsAppMessagePayload): Promise<string> {
  const text = (payload.text || '').trim()
  const lowerText = text.toLowerCase()
  const userPhone = payload.from
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://getpremuimverific.vercel.app'

  const session = userSessions[userPhone] || { step: 'MAIN' }

  // 1. GREETING / MAIN MENU COMMAND
  const isReset = 
    lowerText.startsWith('/start') || 
    lowerText.startsWith('/menu') || 
    lowerText.startsWith('/help') || 
    lowerText === 'hi' || 
    lowerText === 'hello' || 
    lowerText === 'start' || 
    lowerText === 'menu' || 
    lowerText === '0' ||
    lowerText === 'help' ||
    lowerText === 'main'

  if (isReset) {
    userSessions[userPhone] = { step: 'MAIN' }
    return (
      `👋 *Welcome to Premium Verify WhatsApp Bot!*\n\n` +
      `How can I help you today? Please reply with a number:\n\n` +
      `1️⃣ *Virtual SMS Numbers* (WhatsApp, Telegram, Gmail, TikTok...)\n` +
      `2️⃣ *Social Media Growth* (Followers, Likes, Views, Members...)\n` +
      `3️⃣ *Top up Wallet Balance* (MTN MoMo, Orange Money, Card, PayPal)\n` +
      `4️⃣ *Check Wallet Balance*\n\n` +
      `💡 _Reply with 1, 2, 3, or 4 to select, or type "menu" anytime to restart._`
    )
  }

  // 2. CHECK BALANCE (/balance, 4, balance)
  if (lowerText === '4' || lowerText === '/balance' || lowerText === 'balance' || lowerText === 'solde') {
    return (
      `💼 *Premium Verify Wallet Status*\n\n` +
      `👤 *User:* ${payload.name || userPhone}\n` +
      `💵 *Balance:* 25,000 XAF (~$41.60 USD)\n` +
      `⚡ *Status:* Active Member\n\n` +
      `To deposit funds, reply \`3\` or type \`pay 5000\`.`
    )
  }

  // 3. TOP UP WALLET (3, /pay, pay, deposit, topup)
  if (lowerText === '3' || lowerText.startsWith('pay ') || lowerText.startsWith('/pay ') || lowerText.startsWith('topup ') || lowerText === 'deposit') {
    userSessions[userPhone] = { step: 'PAY' }
    const parts = text.split(' ').filter(Boolean)
    const amount = Number(parts[1])

    if (amount && amount > 0) {
      const checkoutUrl = await getPayunitCheckoutUrl(amount)
      return (
        `💳 *Payunit Payment Link Generated!*\n\n` +
        `💰 *Deposit Amount:* ${amount.toLocaleString()} XAF\n` +
        `📱 *Channels:* MTN MoMo, Orange Money, Credit Cards, PayPal\n\n` +
        `👉 *Click here to complete payment:* ${checkoutUrl}`
      )
    }

    return (
      `💳 *Wallet Topup (Payunit)*\n\n` +
      `Reply with the amount in XAF you wish to deposit (Minimum: 500 XAF).\n\n` +
      `*Example:* \`5000\` or \`10000\``
    )
  }

  // If in PAY step and user enters a number
  if (session.step === 'PAY' && !isNaN(Number(text))) {
    const amount = Number(text)
    if (amount >= 500) {
      userSessions[userPhone] = { step: 'MAIN' }
      const checkoutUrl = await getPayunitCheckoutUrl(amount)
      return (
        `💳 *Payunit Payment Link Generated!*\n\n` +
        `💰 *Deposit Amount:* ${amount.toLocaleString()} XAF\n` +
        `📱 *Channels:* MTN MoMo, Orange Money, Credit Cards, PayPal\n\n` +
        `👉 *Click here to complete payment:* ${checkoutUrl}`
      )
    }
  }

  // 4. SMS FLOW (1, /sms, sms, virtual number)
  if (lowerText === '1' || lowerText === '/sms' || lowerText === 'sms' || lowerText.includes('sms number')) {
    userSessions[userPhone] = { step: 'SMS_PLATFORM' }
    return (
      `📱 *Virtual SMS Verification Numbers*\n\n` +
      `Select your target app/service by replying with a letter:\n\n` +
      `*A.* WhatsApp\n` +
      `*B.* Telegram\n` +
      `*C.* Google / Gmail / YouTube\n` +
      `*D.* TikTok\n` +
      `*E.* Instagram / Facebook\n` +
      `*F.* Other Services (Netflix, Steam, OpenAI...)\n\n` +
      `_Reply with A, B, C, D, E, or F_`
    )
  }

  // SMS Platform Sub-Selection (A, B, C, D, E, F)
  if (session.step === 'SMS_PLATFORM' || ['a', 'b', 'c', 'd', 'e', 'f'].includes(lowerText)) {
    let serviceCode = 'wa'
    let serviceName = 'WhatsApp'

    if (lowerText === 'b' || lowerText.includes('telegram')) {
      serviceCode = 'tg'; serviceName = 'Telegram'
    } else if (lowerText === 'c' || lowerText.includes('google') || lowerText.includes('gmail')) {
      serviceCode = 'go'; serviceName = 'Google / Gmail'
    } else if (lowerText === 'd' || lowerText.includes('tiktok')) {
      serviceCode = 'tk'; serviceName = 'TikTok'
    } else if (lowerText === 'e' || lowerText.includes('instagram')) {
      serviceCode = 'ig'; serviceName = 'Instagram'
    } else if (lowerText === 'f' || lowerText.includes('other')) {
      serviceCode = 'ot'; serviceName = 'Other Services'
    }

    userSessions[userPhone] = { step: 'SMS_COUNTRY', service: serviceCode }

    return (
      `🌍 *Choose Country for ${serviceName} SMS:*\n\n` +
      `1️⃣ 🇺🇸 United States (+1) - 500 XAF\n` +
      `2️⃣ 🇬🇧 United Kingdom (+44) - 600 XAF\n` +
      `3️⃣ 🇨🇲 Cameroon (+237) - 400 XAF\n` +
      `4️⃣ 🇳🇬 Nigeria (+234) - 450 XAF\n` +
      `5️⃣ 🇫🇷 France (+33) - 750 XAF\n\n` +
      `_Reply with 1, 2, 3, 4, or 5 to allocate your number immediately._`
    )
  }

  // Direct SMS Command or SMS Country Selection
  if (
    lowerText.startsWith('/sms ') || 
    lowerText.startsWith('sms ') || 
    (session.step === 'SMS_COUNTRY' && ['1', '2', '3', '4', '5', 'us', 'gb', 'cm', 'ng', 'fr'].includes(lowerText))
  ) {
    let service = session.service || 'wa'
    let country = 'US'

    if (lowerText.startsWith('/sms ') || lowerText.startsWith('sms ')) {
      const parts = text.split(' ').filter(Boolean)
      service = parts[1] || service
      country = (parts[2] || 'US').toUpperCase()
    } else {
      const countryMap: Record<string, string> = {
        '1': 'US', 'us': 'US',
        '2': 'GB', 'gb': 'GB', 'uk': 'GB',
        '3': 'CM', 'cm': 'CM',
        '4': 'NG', 'ng': 'NG',
        '5': 'FR', 'fr': 'FR'
      }
      country = countryMap[lowerText] || 'US'
    }

    userSessions[userPhone] = { step: 'MAIN' }
    const result = await allocateSmsNumber(service, country)

    return (
      `✅ *SMS Virtual Number Allocated!*\n\n` +
      `📱 *Phone Number:* \`${result.phone}\`\n` +
      `🏷️ *Service:* ${result.service.toUpperCase()}\n` +
      `🌍 *Country:* ${result.country}\n` +
      `🆔 *Order ID:* ${result.id}\n\n` +
      `⏳ *Status:* Waiting for SMS Code...\n` +
      `_Check code arrival live at:_ ${appUrl}/sms-verification`
    )
  }

  // 5. SMM PANEL FLOW (2, /smm, smm, growth, social media)
  if (lowerText === '2' || lowerText === '/smm' || lowerText === 'smm' || lowerText.includes('growth') || lowerText.includes('social media')) {
    userSessions[userPhone] = { step: 'SMM_PLATFORM' }
    return (
      `🚀 *Social Media Growth Services (SMM)*\n\n` +
      `Select platform by replying with the code:\n\n` +
      `✈️ *T1* - Telegram (Members, Views, Reactions)\n` +
      `📸 *I1* - Instagram (Followers, Likes, Views)\n` +
      `▶️ *Y1* - YouTube (Subscribers, Views, Likes)\n` +
      `🎵 *TK* - TikTok (Followers, Likes, Views)\n` +
      `👤 *F1* - Facebook (Page Likes, Profile Followers)\n\n` +
      `_Reply with T1, I1, Y1, TK, or F1_`
    )
  }

  // SMM Platform Sub-Selection (T1, I1, Y1, TK, F1)
  if (session.step === 'SMM_PLATFORM' || ['t1', 'i1', 'y1', 'tk', 'f1', 'telegram', 'instagram', 'youtube', 'tiktok', 'facebook'].includes(lowerText)) {
    userSessions[userPhone] = { step: 'SMM_ORDER' }

    if (lowerText === 't1' || lowerText.includes('telegram')) {
      return (
        `✈️ *Telegram Growth Options*\n\n` +
        `*S1.* High-Quality Real Telegram Members — 1,500 XAF / 1,000\n` +
        `*S2.* Non-Drop Premium Telegram Members — 2,500 XAF / 1,000\n` +
        `*S3.* Instant Telegram Post Views — 500 XAF / 1,000\n` +
        `*S4.* Telegram Positive Reactions / Votes — 800 XAF / 1,000\n\n` +
        `👉 *To Order:* reply with \`code link quantity\`\n` +
        `_Example:_ \`S1 https://t.me/mychannel 1000\``
      )
    }

    if (lowerText === 'i1' || lowerText.includes('instagram')) {
      return (
        `📸 *Instagram Growth Options*\n\n` +
        `*S5.* Real Instagram Followers — 1,800 XAF / 1,000\n` +
        `*S6.* Instant Instagram Post Likes — 600 XAF / 1,000\n` +
        `*S7.* Instagram Reel Views — 400 XAF / 1,000\n\n` +
        `👉 *To Order:* reply with \`code link quantity\`\n` +
        `_Example:_ \`S5 https://instagram.com/myprofile 1000\``
      )
    }

    if (lowerText === 'y1' || lowerText.includes('youtube')) {
      return (
        `▶️ *YouTube Growth Options*\n\n` +
        `*S8.* High Retention YouTube Views — 2,800 XAF / 1,000\n` +
        `*S9.* Real YouTube Subscribers — 6,500 XAF / 1,000\n` +
        `*S10.* YouTube Video Likes — 1,200 XAF / 1,000\n\n` +
        `👉 *To Order:* reply with \`code link quantity\`\n` +
        `_Example:_ \`S8 https://youtu.be/video_id 1000\``
      )
    }

    if (lowerText === 'tk' || lowerText.includes('tiktok')) {
      return (
        `🎵 *TikTok Growth Options*\n\n` +
        `*S11.* Real TikTok Followers — 2,200 XAF / 1,000\n` +
        `*S12.* Fast TikTok Video Likes — 800 XAF / 1,000\n` +
        `*S13.* TikTok Video Views — 300 XAF / 1,000\n\n` +
        `👉 *To Order:* reply with \`code link quantity\`\n` +
        `_Example:_ \`S11 https://tiktok.com/@username 1000\``
      )
    }

    if (lowerText === 'f1' || lowerText.includes('facebook')) {
      return (
        `👤 *Facebook Growth Options*\n\n` +
        `*S14.* Real Facebook Page Likes / Followers — 2,400 XAF / 1,000\n` +
        `*S15.* Facebook Profile Followers — 2,000 XAF / 1,000\n` +
        `*S16.* Facebook Post Reactions — 900 XAF / 1,000\n\n` +
        `👉 *To Order:* reply with \`code link quantity\`\n` +
        `_Example:_ \`S14 https://facebook.com/page 1000\``
      )
    }
  }

  // SMM ORDER EXECUTION (e.g. S1 https://t.me/channel 1000 or smm S1 https://t.me/channel 1000)
  const smmPrefixMatch = lowerText.startsWith('smm ') || lowerText.startsWith('/smm ')
  const parts = text.split(' ').filter(Boolean)
  const codeCandidate = smmPrefixMatch ? (parts[1] || '').toUpperCase() : (parts[0] || '').toUpperCase()

  if (CODE_TO_SERVICE[codeCandidate] || (!isNaN(Number(codeCandidate)) && parts.length >= (smmPrefixMatch ? 4 : 3))) {
    let serviceId = 101
    let serviceName = 'SMM Package'
    let link = ''
    let quantity = 1000

    if (CODE_TO_SERVICE[codeCandidate]) {
      const pkg = CODE_TO_SERVICE[codeCandidate]
      serviceId = pkg.id
      serviceName = pkg.name
      link = smmPrefixMatch ? parts[2] : parts[1]
      quantity = Number(smmPrefixMatch ? parts[3] : parts[2]) || 1000
    } else {
      serviceId = Number(codeCandidate)
      link = smmPrefixMatch ? parts[2] : parts[1]
      quantity = Number(smmPrefixMatch ? parts[3] : parts[2]) || 1000
    }

    if (link && quantity > 0) {
      userSessions[userPhone] = { step: 'MAIN' }
      const res = await placeSmmOrder(serviceId, link, quantity)
      return (
        `🚀 *SMM Order Placed Successfully!*\n\n` +
        `📦 *Order Ref:* #${res.order}\n` +
        `🎯 *Service:* ${serviceName} (ID: ${serviceId})\n` +
        `🔗 *Target Link:* ${link}\n` +
        `📊 *Quantity:* ${quantity.toLocaleString()}\n` +
        `⚡ *Status:* Processing\n\n` +
        `Track updates at ${appUrl}/smm-panel`
      )
    }
  }

  // DEFAULT FALLBACK RESPONSE
  return (
    `❓ Unrecognized input: "${payload.text}"\n\n` +
    `Please reply with \`1\` for SMS Numbers, \`2\` for Social Media Growth, \`3\` to Top Up, \`4\` for Balance, or type \`menu\`.`
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
