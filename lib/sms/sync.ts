import type { SupabaseClient } from '@supabase/supabase-js'
import { sendTelegramMessage } from '@/lib/telegram/bot'
import { sendWhatsAppMessage } from '@/lib/whatsapp/bot'

const baseUrl = (process.env.SMS_PROVIDER_BASE_URL || 'https://5sim.net/v1').replace(/\/$/, '')

type SmsOrderForSync = {
  id: string
  provider_order_id: string
  phone_number: string
  service_name: string
  profile_id: string
}

type ProfileForNotification = {
  email: string
  phone_number: string | null
  telegram_chat_id: string | null
}

/** Checks an activation without trusting client input and notifies bot customers
 * only when a newly received code has been persisted. */
export async function syncSmsOrder(admin: SupabaseClient, order: SmsOrderForSync) {
  const token = process.env.SMS_PROVIDER_API_KEY
  if (!token) throw new Error('SMS provider is not configured.')

  const response = await fetch(`${baseUrl}/user/check/${encodeURIComponent(order.provider_order_id)}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    signal: AbortSignal.timeout(15_000),
  })
  const provider = await response.json().catch(() => ({})) as {
    sms?: Array<{ code?: string }>
    status?: string
    error?: string
  }
  if (!response.ok) throw new Error(provider.error || 'SMS provider status check failed.')

  const code = provider.sms?.find((message) => message.code)?.code
  if (code) {
    const { data: updated, error } = await admin.from('sms_orders')
      .update({ sms_code: code, status: 'received' })
      .eq('id', order.id).eq('status', 'waiting_sms').select('id').maybeSingle()
    if (error) throw error
    if (!updated) return { updated: false, notified: false, status: 'already_received' }

    await fetch(`${baseUrl}/user/finish/${encodeURIComponent(order.provider_order_id)}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(15_000),
    }).catch(() => undefined)

    const { data: profile } = await admin.from('profiles')
      .select('email, phone_number, telegram_chat_id').eq('id', order.profile_id).maybeSingle()
    const notified = await notifyBotCustomer(profile as ProfileForNotification | null, order, code)
    return { updated: true, notified, status: 'received' }
  }

  const providerStatus = String(provider.status || '').toUpperCase()
  if (['CANCELED', 'BANNED', 'TIMEOUT'].includes(providerStatus) && Array.isArray(provider.sms) && provider.sms.length === 0) {
    const status = providerStatus === 'TIMEOUT' ? 'expired' : 'canceled'
    if (providerStatus === 'BANNED') {
      const { error } = await admin.from('sms_orders').update({ status })
        .eq('id', order.id).eq('status', 'waiting_sms').is('sms_code', null)
      if (error) throw error
    } else {
      const { error } = await admin.rpc('refund_ended_sms_order', {
        p_order_id: order.id,
        p_provider_order_id: order.provider_order_id,
        p_final_status: status,
      })
      if (error) throw error
    }
    return { updated: true, notified: false, status }
  }
  return { updated: false, notified: false, status: 'waiting' }
}

async function notifyBotCustomer(profile: ProfileForNotification | null, order: SmsOrderForSync, code: string) {
  if (!profile) return false
  const message = `Your ${order.service_name} verification code for ${order.phone_number} is: ${code}. Do not share this code with anyone.`
  if (profile.telegram_chat_id && profile.email.startsWith('tg.')) {
    return sendTelegramMessage(profile.telegram_chat_id, message)
  }
  if (profile.phone_number && profile.email.startsWith('wa.')) {
    return sendWhatsAppMessage(profile.phone_number, message)
  }
  return false
}
