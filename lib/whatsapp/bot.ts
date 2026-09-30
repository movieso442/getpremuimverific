/**
 * WhatsApp Cloud API Assistant Bot Core Module
 * Interactive multi-step guided assistant engine.
 */

import { createClient } from '@supabase/supabase-js'
import { fetchFiveSimCountries, fetchFiveSimProducts, fetchFiveSimQuote } from '@/lib/providers/fivesim'
import { getOrCreateWhatsAppCustomer } from '@/lib/bots/customers'
import { getPlatformSettings, retailPrice } from '@/lib/platform/settings'
import { createBotCheckoutLink } from '@/lib/bots/checkout'
import { checkLatestBotSms, reserveLiveBotSms } from '@/lib/bots/sms'

export interface WhatsAppMessagePayload {
  from: string
  text: string
  name?: string
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
  return process.env.NEXT_PUBLIC_APP_URL || 'https://premiumverific.com'
}

const fiveSimBaseUrl = (process.env.SMS_PROVIDER_BASE_URL || 'https://5sim.net/v1').replace(/\/$/, '')

async function legacyLiveCountryMenu(page = 1) {
  const countries = await fetchFiveSimCountries(fiveSimBaseUrl)
  const size = 20
  const safePage = Math.max(1, Math.min(page, Math.ceil(countries.length / size)))
  const items = countries.slice((safePage - 1) * size, safePage * size)
  return `*Available countries — page ${safePage}/${Math.ceil(countries.length / size)}*\n\n${items.map((country, index) => `${(safePage - 1) * size + index + 1}. ${country.label}`).join('\n')}\n\nReply \`services <country>\` to see available verification services. Type \`countries ${safePage + 1}\` for the next page.`
}

async function legacyLiveServiceMenu(countryInput: string, page = 1) {
  const country = countryInput.toLowerCase().replace(/\s+/g, '')
  const countries = await fetchFiveSimCountries(fiveSimBaseUrl)
  if (!countries.some((item) => item.slug === country)) return `I could not find “${countryInput}”. Type \`countries\` to browse the country list.`
  const services = await fetchFiveSimProducts(fiveSimBaseUrl, country)
  if (!services.length) return `There are no verification numbers available for ${country} right now. Try another country or type \`countries\`.`
  const size = 15
  const safePage = Math.max(1, Math.min(page, Math.ceil(services.length / size)))
  const items = services.slice((safePage - 1) * size, safePage * size)
  return `*Available verification services — ${country} — page ${safePage}/${Math.ceil(services.length / size)}*\n\n${items.map((item, index) => `${(safePage - 1) * size + index + 1}. \`${item.product}\` — ${item.available.toLocaleString()} available`).join('\n')}\n\nReply \`services ${country} ${safePage + 1}\` for more.`
}

type ListChoice = { id: string; title: string; description?: string }

function listMarker(button: string, title: string, choices: ListChoice[]) {
  return `\n[[PV_LIST:${encodeURIComponent(JSON.stringify({ button, title, choices }))}]]`
}

function friendlyProductName(product: string) {
  return product.replace(/[-_]+/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase())
}

function resolveCountry(input: string, countries: Awaited<ReturnType<typeof fetchFiveSimCountries>>) {
  const normalized = input.trim().toLowerCase().replace(/\s+/g, '')
  if (/^\d+$/.test(normalized)) return countries[Number(normalized) - 1]
  return countries.find((country) => country.slug === normalized || country.label.toLowerCase().replace(/\s+/g, '') === normalized)
}

async function liveCountryMenu(page = 1) {
  const countries = await fetchFiveSimCountries(fiveSimBaseUrl)
  const size = 10
  const safePage = Math.max(1, Math.min(page, Math.ceil(countries.length / size)))
  const items = countries.slice((safePage - 1) * size, safePage * size)
  const next = safePage < Math.ceil(countries.length / size) ? ` Reply \`page ${safePage + 1}\` for more countries.` : ''
  return `*Choose a country for your temporary verification number*\n\nTap *Select country* below to choose from the available countries.${next}\n\nYou can also type a country name, for example \`Cameroon\`.` + listMarker('Select country', 'Available countries', items.map((country) => ({ id: `country:${country.slug}`, title: country.label, description: 'View available services' })))
}

async function liveServiceMenu(countryInput: string, page = 1) {
  const countries = await fetchFiveSimCountries(fiveSimBaseUrl)
  const selectedCountry = resolveCountry(countryInput, countries)
  if (!selectedCountry) return `I could not find "${countryInput}". Tap *Select country* again or type \`countries\` to browse.`
  const services = await fetchFiveSimProducts(fiveSimBaseUrl, selectedCountry.slug)
  if (!services.length) return `There are no temporary verification numbers available for ${selectedCountry.label} at the moment. Please choose another country.`
  const size = 10
  const safePage = Math.max(1, Math.min(page, Math.ceil(services.length / size)))
  const items = services.slice((safePage - 1) * size, safePage * size)
  const next = safePage < Math.ceil(services.length / size) ? ` Reply \`more ${selectedCountry.slug} ${safePage + 1}\` for more.` : ''
  return `*Available verification services in ${selectedCountry.label}*\n\nTap *Select service* to see the current price and availability.${next}` + listMarker('Select service', `${selectedCountry.label} services`, items.map((item) => ({ id: `service:${selectedCountry.slug}:${encodeURIComponent(item.product)}`, title: friendlyProductName(item.product), description: `${item.available.toLocaleString()} available` })))
}

async function liveProductQuote(countryInput: string, productInput: string) {
  const countries = await fetchFiveSimCountries(fiveSimBaseUrl)
  const country = resolveCountry(countryInput, countries)
  if (!country) return 'That country is no longer available. Please choose a country again.'
  const product = decodeURIComponent(productInput).toLowerCase()
  const quote = await fetchFiveSimQuote(fiveSimBaseUrl, country.slug, product)
  if (!quote) return `${friendlyProductName(product)} is not available in ${country.label} right now. Please choose another service or country.`
  const adminUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const settings = adminUrl && adminKey ? await getPlatformSettings(createClient(adminUrl, adminKey)) : { sms_markup_multiplier: 3 }
  const price = retailPrice(quote.costUsd * 600, settings.sms_markup_multiplier)
  return `*${friendlyProductName(product)} verification number*\n\nCountry: ${country.label}\nCurrent price: *${price.toLocaleString()} XAF*\nAvailable now: ${quote.available.toLocaleString()}\n\nTap *Reserve number* to use your wallet.` + listMarker('Reserve number', 'Confirm reservation', [{ id: `reserve:${country.slug}:${encodeURIComponent(product)}`, title: 'Reserve number', description: `${price.toLocaleString()} XAF from wallet` }])
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
      .or(`phone_number.eq.${identifier},user_id.eq.${identifier}`)
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

async function getPayunitCheckoutUrl(profileId: string | undefined, amount: number): Promise<string | null> {
  return profileId ? createBotCheckoutLink(profileId, amount) : null
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

  return null
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

  return null
}

export async function processWhatsAppMessage(payload: WhatsAppMessagePayload): Promise<string> {
  const text = (payload.text || '').trim()
  const lowerText = text.normalize('NFKC').toLowerCase().trim().replace(/\s+/g, ' ')
  const userPhone = payload.from
  const appUrl = getAppUrl()

  const session = userSessions[userPhone] || { step: 'MAIN' }

  // Meta supplies the sender number and display name. Create one customer
  // profile on first contact, then use that same profile on every message.
  const userProfile = await getOrCreateWhatsAppCustomer(userPhone, payload.name)
  const currentBalance = userProfile ? Number(userProfile.balance_xaf) || 0 : 0

  if (lowerText === 'check code' || lowerText === 'sms status' || lowerText === 'check sms') {
    if (!userProfile) return 'Your customer wallet is unavailable. Please try again in a moment.'
    const status = await checkLatestBotSms(userProfile.id)
    if (status.kind === 'received') return `*Your verification code:* \`${status.code}\``
    if (status.kind === 'waiting') return `Your number is still waiting for the SMS code. Please try \`check code\` again shortly.${status.expiresAt ? ` It expires at ${new Date(status.expiresAt).toLocaleTimeString()}.` : ''}`
    return status.message
  }

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
  if ((lowerText === '4' && session.step !== 'SMS_CATALOG') || lowerText === '/balance' || lowerText === 'balance' || lowerText === 'solde') {
    const usd = (currentBalance / 600).toFixed(2)
    return (
      `💼 *Premium Verify Wallet Status*\n\n` +
      `👤 *User:* ${payload.name || userPhone}\n` +
      `💵 *Balance:* ${currentBalance.toLocaleString()} XAF (~$${usd} USD)\n` +
      `⚡ *Status:* Active Member\n\n` +
      `To deposit funds, reply \`3\` or type \`pay 5000\`.`
    )
  }

  // 3. TOP UP WALLET (3, /pay, pay, deposit, topup)
  if ((lowerText === '3' && session.step !== 'SMS_CATALOG') || lowerText.startsWith('pay ') || lowerText.startsWith('/pay ') || lowerText.startsWith('topup ') || lowerText === 'deposit') {
    userSessions[userPhone] = { step: 'PAY' }
    const parts = text.split(' ').filter(Boolean)
    const amount = Number(parts[1])

    if (amount && amount > 0) {
      const checkoutUrl = await getPayunitCheckoutUrl(userProfile?.id, amount)
      if (!checkoutUrl) return 'I could not create a secure top-up link. Please try again in a moment.'
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
      const checkoutUrl = await getPayunitCheckoutUrl(userProfile?.id, amount)
      if (!checkoutUrl) return 'I could not create a secure top-up link. Please try again in a moment.'
      return (
        `💳 *Payunit Payment Link Generated!*\n\n` +
        `💰 *Deposit Amount:* ${amount.toLocaleString()} XAF\n` +
        `📱 *Channels:* MTN MoMo, Orange Money, Credit Cards, PayPal\n\n` +
        `👉 *Click here to complete payment:* ${checkoutUrl}`
      )
    }
  }

  // Live temporary-number catalogue. Interactive list replies arrive as the
  // IDs below; text replies work too, so the flow remains accessible on every
  // WhatsApp client and after a conversation window changes.
  const countryReply = lowerText.match(/^country:([a-z0-9_-]+)$/)
  if (countryReply) return liveServiceMenu(countryReply[1])
  const serviceReply = text.match(/^service:([a-z0-9_-]+):(.+)$/i)
  if (serviceReply) return liveProductQuote(serviceReply[1], serviceReply[2])
  const reserveReply = text.match(/^reserve:([a-z0-9_-]+):(.+)$/i)
  if (reserveReply) {
    if (!userProfile) return 'Your customer wallet is unavailable. Please try again in a moment.'
    const reservation = await reserveLiveBotSms(userProfile.id, reserveReply[1], reserveReply[2])
    if (reservation.kind === 'success') return `*Verification number reserved*\n\nNumber: \`${reservation.phone}\`\nService: ${friendlyProductName(reservation.service)}\nCountry: ${reservation.country}\nCharged: ${reservation.priceXaf.toLocaleString()} XAF\n\nWhen the SMS arrives, reply \`check code\`.`
    if (reservation.kind === 'insufficient') {
      const topupUrl = await getPayunitCheckoutUrl(userProfile.id, reservation.requiredXaf - reservation.balanceXaf)
      return `Your wallet needs ${reservation.requiredXaf.toLocaleString()} XAF; current balance is ${reservation.balanceXaf.toLocaleString()} XAF.${topupUrl ? `\n\nTop up securely: ${topupUrl}` : ''}`
    }
    return reservation.message
  }
  const pageMatch = lowerText.match(/^(?:page|countries)\s+(\d+)$/)
  if (pageMatch) return liveCountryMenu(Number(pageMatch[1]))
  const moreMatch = lowerText.match(/^(?:more|services)\s+([a-z\s-]+?)(?:\s+(\d+))?$/)
  if (moreMatch) return liveServiceMenu(moreMatch[1], Number(moreMatch[2] || 1))
  if (lowerText === 'countries') return liveCountryMenu()
  if (lowerText.startsWith('country ')) return liveServiceMenu(lowerText.slice('country '.length))
  if (session.step === 'SMS_CATALOG' && (/^\d+$/.test(lowerText) || /^[a-z][a-z\s-]+$/.test(lowerText))) return liveServiceMenu(lowerText)

  // 5. SMS FLOW (1, /sms, sms, virtual number)
  if (lowerText === '1' || lowerText === '/sms' || lowerText === 'sms' || /\b(number|sms|verification|code|otp)\b/.test(lowerText)) {
    userSessions[userPhone] = { step: 'SMS_CATALOG' }
    return liveCountryMenu()
  }

  // Legacy flow retained below for active conversations created before the
  // live catalogue rollout.
  if (lowerText === '1' || lowerText === '/sms' || lowerText === 'sms' || lowerText.includes('sms number')) {
    userSessions[userPhone] = { step: 'SMS_PLATFORM' }
    return (
      `📱 *Virtual SMS Verification Numbers*\n\n` +
      `Select your target app/service by replying with a letter:\n\n` +
      `*A.* WhatsApp (500 XAF)\n` +
      `*B.* Telegram (500 XAF)\n` +
      `*C.* Google / Gmail / YouTube (450 XAF)\n` +
      `*D.* TikTok (400 XAF)\n` +
      `*E.* Instagram / Facebook (450 XAF)\n` +
      `*F.* Other Services (600 XAF)\n\n` +
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
      `1️⃣ 🇺🇸 United States (+1)\n` +
      `2️⃣ 🇬🇧 United Kingdom (+44)\n` +
      `3️⃣ 🇨🇲 Cameroon (+237)\n` +
      `4️⃣ 🇳🇬 Nigeria (+234)\n` +
      `5️⃣ 🇫🇷 France (+33)\n\n` +
      `_Reply with 1, 2, 3, 4, or 5 to allocate your number._`
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
      const topupUrl = await getPayunitCheckoutUrl(userProfile?.id, price)
      if (!topupUrl) return 'Your balance is too low, and a secure top-up link could not be created. Please try again.'
      return (
        `⚠️ *Insufficient Wallet Balance!*\n\n` +
        `💳 *Required:* ${price.toLocaleString()} XAF\n` +
        `💵 *Your Balance:* ${currentBalance.toLocaleString()} XAF\n\n` +
        `Please top up your account balance to receive this virtual number:\n` +
        `👉 *Click to Top Up:* ${topupUrl}`
      )
    }

    userSessions[userPhone] = { step: 'MAIN' }
    const result = await allocateSmsNumber(service, country)
    if (!result) return 'The live verification-number service could not reserve a number. No wallet funds were charged. Please try again shortly.'

    // Deduct balance from DB profile if present
    if (userProfile) {
      await updateProfileBalance(userProfile.id, currentBalance - price)
    }

    return (
      `✅ *SMS Virtual Number Allocated!*\n\n` +
      `📱 *Phone Number:* \`${result.phone}\`\n` +
      `🏷️ *Service:* ${result.service.toUpperCase()}\n` +
      `🌍 *Country:* ${result.country}\n` +
      `🆔 *Order ID:* ${result.id}\n\n` +
      `⏳ *Status:* Waiting for SMS Code...\n` +
      `_Track live code arrival at:_ ${appUrl}/sms-verification`
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

  // Single code prompt check (e.g. user sends "S1" alone)
  const singleCode = text.toUpperCase()
  if (CODE_TO_SERVICE[singleCode] && text.split(' ').filter(Boolean).length === 1) {
    const pkg = CODE_TO_SERVICE[singleCode]
    return (
      `🎯 *Package Selected: ${pkg.name}*\n` +
      `💰 *Rate:* ${pkg.rateText}\n\n` +
      `👉 *To complete order, reply in format:*\n` +
      `\`${singleCode} <target_link> <quantity>\`\n\n` +
      `_Example:_ \`${singleCode} https://t.me/mychannel 1000\``
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
      const topupUrl = await getPayunitCheckoutUrl(userProfile?.id, calculatedCharge)
      if (!topupUrl) return 'Your balance is too low, and a secure top-up link could not be created. Please try again.'
      return (
        `⚠️ *Insufficient Wallet Balance!*\n\n` +
        `🎯 *Order Total:* ${calculatedCharge.toLocaleString()} XAF\n` +
        `💵 *Your Balance:* ${currentBalance.toLocaleString()} XAF\n\n` +
        `Please top up your wallet to place this order:\n` +
        `👉 *Click to Top Up:* ${topupUrl}`
      )
    }

    if (link && quantity > 0) {
      userSessions[userPhone] = { step: 'MAIN' }
      const res = await placeSmmOrder(serviceId, link, quantity)
      if (!res) return 'The live social-media service could not accept this order. No wallet funds were charged. Please try again shortly.'

      // Deduct balance from DB profile if present
      if (userProfile) {
        await updateProfileBalance(userProfile.id, currentBalance - calculatedCharge)
      }

      return (
        `🚀 *SMM Order Placed Successfully!*\n\n` +
        `📦 *Order Ref:* #${res.order}\n` +
        `🎯 *Service:* ${serviceName} (ID: ${serviceId})\n` +
        `🔗 *Target Link:* ${link}\n` +
        `📊 *Quantity:* ${quantity.toLocaleString()}\n` +
        `💰 *Charged:* ${calculatedCharge.toLocaleString()} XAF\n` +
        `⚡ *Status:* Processing\n\n` +
        `Track updates at ${appUrl}/smm-panel`
      )
    }
  }

  // Ordinary first messages are normal conversation, not an error. Give a
  // simple intent-based welcome instead of echoing the customer's text back.
  if (session.step === 'MAIN') {
    const name = userProfile?.full_name?.split(/\s+/)[0] || payload.name?.split(/\s+/)[0] || 'there'
    return `Hi ${name}! Welcome to Premium Verify. I can help you get a temporary number, boost social media, top up, or check your balance.\n\nJust say “get a number”, “boost followers”, “top up”, or “help”.`
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
    console.error('[WhatsApp Bot] Meta Cloud API credentials are not configured; no reply was sent.')
    return false
  }

  try {
    const marker = messageText.match(/\s*\[\[PV_LIST:([^\]]+)\]\]\s*$/)
    const cleanText = marker ? messageText.slice(0, marker.index).trim() : messageText
    let message: Record<string, unknown> = {
      messaging_product: 'whatsapp',
      to: toPhone.replace('+', ''),
      type: 'text',
      text: { body: cleanText },
    }
    if (marker) {
      try {
        const menu = JSON.parse(decodeURIComponent(marker[1])) as { button?: string; title?: string; choices?: ListChoice[] }
        const rows = (menu.choices || []).slice(0, 10).map((choice) => ({ id: choice.id.slice(0, 200), title: choice.title.slice(0, 24), description: choice.description?.slice(0, 72) }))
        if (rows.length) {
          message = {
            messaging_product: 'whatsapp',
            to: toPhone.replace('+', ''),
            type: 'interactive',
            interactive: {
              type: 'list',
              body: { text: cleanText.slice(0, 1024) },
              action: { button: (menu.button || 'Choose').slice(0, 20), sections: [{ title: (menu.title || 'Options').slice(0, 24), rows }] },
            },
          }
        }
      } catch (error) {
        console.warn('[WhatsApp list menu encoding failed]', error)
      }
    }
    const res = await fetch(`https://graph.facebook.com/v19.0/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(message)
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
