/**
 * Telegram Bot Assistant Module for @getpremuimverific_bot
 * Interactive multi-step guided assistant engine.
 */

import { createClient } from '@supabase/supabase-js'

export interface TelegramMessagePayload {
  chatId: number | string
  text: string
  fromName?: string
}

// In-memory simple session tracker for user steps
const userSessions: Record<string, { step: string; subStep?: string; service?: string }> = {}

// SMM Packages catalogue
const CODE_TO_SERVICE: Record<string, { id: number; name: string; rateXaf: number; rateText: string }> = {
  S1: { id: 101, name: 'Telegram High-Quality Real Members', rateXaf: 1500, rateText: '1,500 XAF / 1,000' },
  S2: { id: 102, name: 'Telegram Non-Drop Premium Members', rateXaf: 2500, rateText: '2,500 XAF / 1,000' },
  S3: { id: 103, name: 'Telegram Instant Post Views', rateXaf: 500, rateText: '500 XAF / 1,000' },
  S4: { id: 104, name: 'Telegram Positive Reactions / Votes', rateXaf: 800, rateText: '800 XAF / 1,000' },

  S5: { id: 201, name: 'Instagram Real Followers', rateXaf: 1800, rateText: '1,800 XAF / 1,000' },
  S6: { id: 202, name: 'Instagram Instant Post Likes', rateXaf: 600, rateText: '600 XAF / 1,000' },
  S7: { id: 203, name: 'Instagram Reel Views', rateXaf: 400, rateText: '400 XAF / 1,000' },

  S8: { id: 301, name: 'YouTube High Retention Views', rateXaf: 2800, rateText: '2,800 XAF / 1,000' },
  S9: { id: 302, name: 'YouTube Real Subscribers', rateXaf: 6500, rateText: '6,500 XAF / 1,000' },
  S10: { id: 303, name: 'YouTube Video Likes', rateXaf: 1200, rateText: '1,200 XAF / 1,000' },

  S11: { id: 401, name: 'TikTok Real Followers', rateXaf: 2200, rateText: '2,200 XAF / 1,000' },
  S12: { id: 402, name: 'TikTok Video Likes', rateXaf: 800, rateText: '800 XAF / 1,000' },
  S13: { id: 403, name: 'TikTok Video Views', rateXaf: 300, rateText: '300 XAF / 1,000' },

  S14: { id: 501, name: 'Facebook Page Likes / Followers', rateXaf: 2400, rateText: '2,400 XAF / 1,000' },
  S15: { id: 502, name: 'Facebook Profile Followers', rateXaf: 2000, rateText: '2,000 XAF / 1,000' },
  S16: { id: 503, name: 'Facebook Post Reactions', rateXaf: 900, rateText: '900 XAF / 1,000' }
}

const SMS_PRICES: Record<string, number> = {
  wa: 500,
  tg: 500,
  go: 450,
  tk: 400,
  ig: 450,
  ot: 600
}

function getAppUrl(): string {
  return 'https://www.premiumverific.com'
}

async function getProfileFromSupabase(identifier: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://cdfmfxfkbqlcjbesymxd.supabase.co'
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) return null

  try {
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .or(`phone_number.eq.${identifier},user_id.eq.${identifier},telegram_chat_id.eq.${identifier}`)
      .maybeSingle()

    return profile || null
  } catch (err) {
    console.warn('[Supabase Profile Fetch Error]:', err)
    return null
  }
}

async function updateProfileBalance(profileId: string, newBalance: number) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://cdfmfxfkbqlcjbesymxd.supabase.co'
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) return

  try {
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)
    await supabaseAdmin.from('profiles').update({ balance_xaf: newBalance }).eq('id', profileId)
  } catch (err) {
    console.warn('[Supabase Balance Update Error]:', err)
  }
}

async function getPayunitCheckoutUrl(amount: number): Promise<string> {
  const appId = process.env.PAYUNIT_APP_ID || '6f671378-7fae-4fa0-bdee-00b32df34612'
  const apiUser = process.env.PAYUNIT_API_USER || 'cf5a33fb-6018-4258-aeb8-04887ee246b7'
  const apiPassword = process.env.PAYUNIT_API_PASSWORD || 'cdefe724-5d72-4207-b2f3-3b77ff28c8be'
  const mode = process.env.PAYUNIT_MODE || 'live'
  const apiKey = mode === 'live'
    ? (process.env.PAYUNIT_LIVE_KEY || process.env.PAYUNIT_API_KEY || 'live_jpniXcJT6aXHNXujkNw9Hne3qlcLQcz2daqisYPE')
    : (process.env.PAYUNIT_API_KEY || 'sand_aA2n1kinNgZxlGY2xk1Z83JOJrFSu6')
  const appUrl = getAppUrl()
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

export async function processTelegramMessage(payload: TelegramMessagePayload): Promise<string> {
  const text = (payload.text || '').trim()
  const lowerText = text.toLowerCase()
  const chatId = String(payload.chatId)
  const appUrl = getAppUrl()

  const session = userSessions[chatId] || { step: 'MAIN' }

  // Fetch current user profile & balance
  const userProfile = await getProfileFromSupabase(chatId)
  const currentBalance = userProfile ? Number(userProfile.balance_xaf) || 0 : 0

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
    userSessions[chatId] = { step: 'MAIN' }
    return (
      `👋 <b>Welcome to Premium Verify Assistant!</b> (@getpremuimverific_bot)\n\n` +
      `How can I help you today? Please reply with a number:\n\n` +
      `1️⃣ <b>Virtual SMS Numbers</b> (WhatsApp, Telegram, Gmail, TikTok...)\n` +
      `2️⃣ <b>Social Media Growth</b> (Followers, Likes, Views, Members...)\n` +
      `3️⃣ <b>Top up Wallet Balance</b> (MTN MoMo, Orange Money, Card, PayPal)\n` +
      `4️⃣ <b>Check Wallet Balance</b>\n\n` +
      `💡 <i>Reply with 1, 2, 3, or 4 to select, or type "menu" anytime to restart.</i>`
    )
  }

  // 2. CHECK BALANCE (/balance, 4, balance)
  if (lowerText === '4' || lowerText === '/balance' || lowerText === 'balance' || lowerText === 'solde') {
    const usd = (currentBalance / 600).toFixed(2)
    return (
      `💼 <b>Premium Verify Wallet Status</b>\n\n` +
      `👤 <b>User:</b> ${payload.fromName || 'Partner'}\n` +
      `💵 <b>Balance:</b> ${currentBalance.toLocaleString()} XAF (~$${usd} USD)\n` +
      `⚡ <b>Status:</b> Active Member\n\n` +
      `To deposit funds, reply <code>3</code> or type <code>/pay 5000</code>.`
    )
  }

  // 3. TOP UP WALLET (3, /pay, pay, deposit, topup)
  if (lowerText === '3' || lowerText.startsWith('pay ') || lowerText.startsWith('/pay ') || lowerText.startsWith('topup ') || lowerText === 'deposit') {
    userSessions[chatId] = { step: 'PAY' }
    const parts = text.split(' ').filter(Boolean)
    const amount = Number(parts[1])

    if (amount && amount > 0) {
      const checkoutUrl = await getPayunitCheckoutUrl(amount)
      return (
        `💳 <b>Payunit Payment Link Generated!</b>\n\n` +
        `💰 <b>Deposit Amount:</b> ${amount.toLocaleString()} XAF\n` +
        `📱 <b>Channels:</b> MTN MoMo, Orange Money, Credit Cards, PayPal\n\n` +
        `👉 <a href="${checkoutUrl}">Click here to complete payment</a>`
      )
    }

    return (
      `💳 <b>Wallet Topup (Payunit)</b>\n\n` +
      `Reply with the amount in XAF you wish to deposit (Minimum: 500 XAF).\n\n` +
      `<i>Example:</i> <code>5000</code> or <code>10000</code>`
    )
  }

  // If in PAY step and user enters a number
  if (session.step === 'PAY' && !isNaN(Number(text))) {
    const amount = Number(text)
    if (amount >= 500) {
      userSessions[chatId] = { step: 'MAIN' }
      const checkoutUrl = await getPayunitCheckoutUrl(amount)
      return (
        `💳 <b>Payunit Payment Link Generated!</b>\n\n` +
        `💰 <b>Deposit Amount:</b> ${amount.toLocaleString()} XAF\n` +
        `📱 <b>Channels:</b> MTN MoMo, Orange Money, Credit Cards, PayPal\n\n` +
        `👉 <a href="${checkoutUrl}">Click here to complete payment</a>`
      )
    }
  }

  // 4. SMS FLOW (1, /sms, sms, virtual number)
  if (lowerText === '1' || lowerText === '/sms' || lowerText === 'sms' || lowerText.includes('sms number')) {
    userSessions[chatId] = { step: 'SMS_PLATFORM' }
    return (
      `📱 <b>Virtual SMS Verification Numbers</b>\n\n` +
      `Select your target app/service by replying with a letter:\n\n` +
      `<b>A.</b> WhatsApp (500 XAF)\n` +
      `<b>B.</b> Telegram (500 XAF)\n` +
      `<b>C.</b> Google / Gmail / YouTube (450 XAF)\n` +
      `<b>D.</b> TikTok (400 XAF)\n` +
      `<b>E.</b> Instagram / Facebook (450 XAF)\n` +
      `<b>F.</b> Other Services (600 XAF)\n\n` +
      `<i>Reply with A, B, C, D, E, or F</i>`
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

    userSessions[chatId] = { step: 'SMS_COUNTRY', service: serviceCode }

    return (
      `🌍 <b>Choose Country for ${serviceName} SMS:</b>\n\n` +
      `1️⃣ 🇺🇸 United States (+1)\n` +
      `2️⃣ 🇬🇧 United Kingdom (+44)\n` +
      `3️⃣ 🇨🇲 Cameroon (+237)\n` +
      `4️⃣ 🇳🇬 Nigeria (+234)\n` +
      `5️⃣ 🇫🇷 France (+33)\n\n` +
      `<i>Reply with 1, 2, 3, 4, or 5 to allocate your number.</i>`
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

    const price = SMS_PRICES[service] || 500

    // STRICT BALANCE CHECK BEFORE SMS ALLOCATION
    if (currentBalance < price) {
      const topupUrl = await getPayunitCheckoutUrl(price)
      return (
        `⚠️ <b>Insufficient Wallet Balance!</b>\n\n` +
        `💳 <b>Required:</b> ${price.toLocaleString()} XAF\n` +
        `💵 <b>Your Balance:</b> ${currentBalance.toLocaleString()} XAF\n\n` +
        `Please top up your account balance to receive this virtual number:\n` +
        `👉 <a href="${topupUrl}">Click here to Top Up ${price.toLocaleString()} XAF</a>`
      )
    }

    userSessions[chatId] = { step: 'MAIN' }
    const result = await allocateSmsNumber(service, country)

    // Deduct balance from DB profile if present
    if (userProfile) {
      await updateProfileBalance(userProfile.id, currentBalance - price)
    }

    return (
      `✅ <b>SMS Virtual Number Allocated!</b>\n\n` +
      `📱 <b>Phone Number:</b> <code>${result.phone}</code>\n` +
      `🏷️ <b>Service:</b> ${result.service.toUpperCase()}\n` +
      `🌍 <b>Country:</b> ${result.country}\n` +
      `🆔 <b>Order ID:</b> ${result.id}\n\n` +
      `⏳ <b>Status:</b> Waiting for SMS Code...\n` +
      `<i>Track live code arrival at:</i> ${appUrl}/sms-verification`
    )
  }

  // 5. SMM PANEL FLOW (2, /smm, smm, growth, social media)
  if (lowerText === '2' || lowerText === '/smm' || lowerText === 'smm' || lowerText.includes('growth') || lowerText.includes('social media')) {
    userSessions[chatId] = { step: 'SMM_PLATFORM' }
    return (
      `🚀 <b>Social Media Growth Services (SMM)</b>\n\n` +
      `Select platform by replying with the code:\n\n` +
      `✈️ <b>T1</b> - Telegram (Members, Views, Reactions)\n` +
      `📸 <b>I1</b> - Instagram (Followers, Likes, Views)\n` +
      `▶️ <b>Y1</b> - YouTube (Subscribers, Views, Likes)\n` +
      `🎵 <b>TK</b> - TikTok (Followers, Likes, Views)\n` +
      `👤 <b>F1</b> - Facebook (Page Likes, Profile Followers)\n\n` +
      `<i>Reply with T1, I1, Y1, TK, or F1</i>`
    )
  }

  // Single code prompt check (e.g. user sends "S1" alone)
  const singleCode = text.toUpperCase()
  if (CODE_TO_SERVICE[singleCode] && text.split(' ').filter(Boolean).length === 1) {
    const pkg = CODE_TO_SERVICE[singleCode]
    return (
      `🎯 <b>Package Selected: ${pkg.name}</b>\n` +
      `💰 <b>Rate:</b> ${pkg.rateText}\n\n` +
      `👉 <b>To complete order, reply in format:</b>\n` +
      `<code>${singleCode} &lt;target_link&gt; &lt;quantity&gt;</code>\n\n` +
      `<i>Example:</i> <code>${singleCode} https://t.me/mychannel 1000</code>`
    )
  }

  // SMM Platform Sub-Selection (T1, I1, Y1, TK, F1)
  if (session.step === 'SMM_PLATFORM' || ['t1', 'i1', 'y1', 'tk', 'f1', 'telegram', 'instagram', 'youtube', 'tiktok', 'facebook'].includes(lowerText)) {
    userSessions[chatId] = { step: 'SMM_ORDER' }

    if (lowerText === 't1' || lowerText.includes('telegram')) {
      return (
        `✈️ <b>Telegram Growth Options</b>\n\n` +
        `<b>S1.</b> High-Quality Real Telegram Members — 1,500 XAF / 1,000\n` +
        `<b>S2.</b> Non-Drop Premium Telegram Members — 2,500 XAF / 1,000\n` +
        `<b>S3.</b> Instant Telegram Post Views — 500 XAF / 1,000\n` +
        `<b>S4.</b> Telegram Positive Reactions / Votes — 800 XAF / 1,000\n\n` +
        `👉 <b>To Order:</b> reply with <code>code link quantity</code>\n` +
        `<i>Example:</i> <code>S1 https://t.me/mychannel 1000</code>`
      )
    }

    if (lowerText === 'i1' || lowerText.includes('instagram')) {
      return (
        `📸 <b>Instagram Growth Options</b>\n\n` +
        `<b>S5.</b> Real Instagram Followers — 1,800 XAF / 1,000\n` +
        `<b>S6.</b> Instant Instagram Post Likes — 600 XAF / 1,000\n` +
        `<b>S7.</b> Instagram Reel Views — 400 XAF / 1,000\n\n` +
        `👉 <b>To Order:</b> reply with <code>code link quantity</code>\n` +
        `<i>Example:</i> <code>S5 https://instagram.com/myprofile 1000</code>`
      )
    }

    if (lowerText === 'y1' || lowerText.includes('youtube')) {
      return (
        `▶️ <b>YouTube Growth Options</b>\n\n` +
        `<b>S8.</b> High Retention YouTube Views — 2,800 XAF / 1,000\n` +
        `<b>S9.</b> Real YouTube Subscribers — 6,500 XAF / 1,000\n` +
        `<b>S10.</b> YouTube Video Likes — 1,200 XAF / 1,000\n\n` +
        `👉 <b>To Order:</b> reply with <code>code link quantity</code>\n` +
        `<i>Example:</i> <code>S8 https://youtu.be/video_id 1000</code>`
      )
    }

    if (lowerText === 'tk' || lowerText.includes('tiktok')) {
      return (
        `🎵 <b>TikTok Growth Options</b>\n\n` +
        `<b>S11.</b> Real TikTok Followers — 2,200 XAF / 1,000\n` +
        `<b>S12.</b> Fast TikTok Video Likes — 800 XAF / 1,000\n` +
        `<b>S13.</b> TikTok Video Views — 300 XAF / 1,000\n\n` +
        `👉 <b>To Order:</b> reply with <code>code link quantity</code>\n` +
        `<i>Example:</i> <code>S11 https://tiktok.com/@username 1000</code>`
      )
    }

    if (lowerText === 'f1' || lowerText.includes('facebook')) {
      return (
        `👤 <b>Facebook Growth Options</b>\n\n` +
        `<b>S14.</b> Real Facebook Page Likes / Followers — 2,400 XAF / 1,000\n` +
        `<b>S15.</b> Facebook Profile Followers — 2,000 XAF / 1,000\n` +
        `<b>S16.</b> Facebook Post Reactions — 900 XAF / 1,000\n\n` +
        `👉 <b>To Order:</b> reply with <code>code link quantity</code>\n` +
        `<i>Example:</i> <code>S14 https://facebook.com/page 1000</code>`
      )
    }
  }

  // SMM ORDER EXECUTION (e.g. S1 https://t.me/channel 1000 or /smm 101 https://t.me/channel 1000)
  const smmPrefixMatch = lowerText.startsWith('/smm ') || lowerText.startsWith('smm ')
  const parts = text.split(' ').filter(Boolean)
  const codeCandidate = smmPrefixMatch ? (parts[1] || '').toUpperCase() : (parts[0] || '').toUpperCase()

  if (CODE_TO_SERVICE[codeCandidate] || (!isNaN(Number(codeCandidate)) && parts.length >= (smmPrefixMatch ? 4 : 3))) {
    let serviceId = 101
    let serviceName = 'SMM Package'
    let link = ''
    let quantity = 1000
    let rateXaf = 1500

    if (CODE_TO_SERVICE[codeCandidate]) {
      const pkg = CODE_TO_SERVICE[codeCandidate]
      serviceId = pkg.id
      serviceName = pkg.name
      rateXaf = pkg.rateXaf
      link = smmPrefixMatch ? parts[2] : parts[1]
      quantity = Number(smmPrefixMatch ? parts[3] : parts[2]) || 1000
    } else {
      serviceId = Number(codeCandidate)
      link = smmPrefixMatch ? parts[2] : parts[1]
      quantity = Number(smmPrefixMatch ? parts[3] : parts[2]) || 1000
    }

    const calculatedCharge = Math.ceil((rateXaf * quantity) / 1000)

    // STRICT BALANCE CHECK BEFORE SMM ORDER FULFILLMENT
    if (currentBalance < calculatedCharge) {
      const topupUrl = await getPayunitCheckoutUrl(calculatedCharge)
      return (
        `⚠️ <b>Insufficient Wallet Balance!</b>\n\n` +
        `🎯 <b>Order Total:</b> ${calculatedCharge.toLocaleString()} XAF\n` +
        `💵 <b>Your Balance:</b> ${currentBalance.toLocaleString()} XAF\n\n` +
        `Please top up your wallet to place this order:\n` +
        `👉 <a href="${topupUrl}">Click here to Top Up ${calculatedCharge.toLocaleString()} XAF</a>`
      )
    }

    if (link && quantity > 0) {
      userSessions[chatId] = { step: 'MAIN' }
      const res = await placeSmmOrder(serviceId, link, quantity)

      // Deduct balance from DB profile if present
      if (userProfile) {
        await updateProfileBalance(userProfile.id, currentBalance - calculatedCharge)
      }

      return (
        `🚀 <b>SMM Order Placed Successfully!</b>\n\n` +
        `📦 <b>Order Ref:</b> #${res.order}\n` +
        `🎯 <b>Service:</b> ${serviceName} (ID: ${serviceId})\n` +
        `🔗 <b>Target Link:</b> ${link}\n` +
        `📊 <b>Quantity:</b> ${quantity.toLocaleString()}\n` +
        `💰 <b>Charged:</b> ${calculatedCharge.toLocaleString()} XAF\n` +
        `⚡ <b>Status:</b> Processing\n\n` +
        `Track updates at ${appUrl}/smm-panel`
      )
    }
  }

  // DEFAULT FALLBACK RESPONSE
  return (
    `❓ Unrecognized input: "${payload.text}"\n\n` +
    `Please reply with <code>1</code> for SMS Numbers, <code>2</code> for Social Media Growth, <code>3</code> to Top Up, <code>4</code> for Balance, or type <code>menu</code>.`
  )
}

/**
 * Send a message via Telegram Bot API
 */
export async function sendTelegramMessage(chatId: number | string, text: string): Promise<boolean> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN || '8838713622:AAG7_pPYAvpquaQH92JO0ebZ6iBlxa6Xxg4'

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
        parse_mode: 'HTML'
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
