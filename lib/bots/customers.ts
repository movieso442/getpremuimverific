import { createClient } from '@supabase/supabase-js'

type BotProfile = {
  id: string
  full_name: string | null
  phone_number: string | null
  telegram_chat_id?: string | null
  balance_xaf: number | string | null
}

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

function displayName(name: string | undefined, fallback: string) {
  return name?.trim().replace(/\s+/g, ' ').slice(0, 120) || fallback
}

/**
 * A chat profile is a platform customer record, not an Auth login. Its generated
 * email is only an internal unique identifier; it is never used to contact the
 * customer or to send a password.
 */
export async function getOrCreateWhatsAppCustomer(rawPhone: string, name?: string): Promise<BotProfile | null> {
  const admin = adminClient()
  const digits = rawPhone.replace(/\D/g, '')
  if (!admin || !digits) return null
  const phone = `+${digits}`

  const { data: existing, error: findError } = await admin
    .from('profiles').select('id, full_name, phone_number, balance_xaf')
    .eq('phone_number', phone).maybeSingle()
  if (findError) {
    console.warn('[WhatsApp customer lookup failed]', findError.message)
    return null
  }
  if (existing) return existing as BotProfile

  const { data, error } = await admin.from('profiles').insert({
    email: `wa.${digits}@bot.premiumverific.invalid`,
    full_name: displayName(name, 'WhatsApp customer'),
    phone_number: phone,
    balance_xaf: 0,
    currency: 'XAF',
    role: 'client',
  }).select('id, full_name, phone_number, balance_xaf').single()
  if (error) {
    // A duplicate delivery can race the first insert. Read the already-created
    // profile instead of creating a second account.
    const { data: raced } = await admin.from('profiles').select('id, full_name, phone_number, balance_xaf').eq('phone_number', phone).maybeSingle()
    if (raced) return raced as BotProfile
    console.warn('[WhatsApp customer creation failed]', error.message)
    return null
  }
  return data as BotProfile
}

export async function getOrCreateTelegramCustomer(chatId: string, name?: string): Promise<BotProfile | null> {
  const admin = adminClient()
  const safeChatId = String(chatId).replace(/[^0-9-]/g, '')
  if (!admin || !safeChatId) return null

  const { data: existing, error: findError } = await admin
    .from('profiles').select('id, full_name, phone_number, telegram_chat_id, balance_xaf')
    .eq('telegram_chat_id', safeChatId).maybeSingle()
  if (findError) {
    console.warn('[Telegram customer lookup failed]', findError.message)
    return null
  }
  if (existing) return existing as BotProfile

  const { data, error } = await admin.from('profiles').insert({
    email: `tg.${safeChatId.replace(/-/g, 'n')}@bot.premiumverific.invalid`,
    full_name: displayName(name, 'Telegram customer'),
    telegram_chat_id: safeChatId,
    balance_xaf: 0,
    currency: 'XAF',
    role: 'client',
  }).select('id, full_name, phone_number, telegram_chat_id, balance_xaf').single()
  if (error) {
    const { data: raced } = await admin.from('profiles').select('id, full_name, phone_number, telegram_chat_id, balance_xaf').eq('telegram_chat_id', safeChatId).maybeSingle()
    if (raced) return raced as BotProfile
    console.warn('[Telegram customer creation failed]', error.message)
    return null
  }
  return data as BotProfile
}

export function firstName(name: string | null | undefined, fallback = 'there') {
  return name?.trim().split(/\s+/)[0] || fallback
}
