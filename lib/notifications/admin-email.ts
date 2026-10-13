import type { SupabaseClient } from '@supabase/supabase-js'
import { after } from 'next/server'
import { CRYPTO_METHODS, isCryptoMethod } from '@/lib/payments/manual-crypto'

type Event = {
  id: string; recipient: string; sender: string; attempts: number;
  payload: { source: string; record_id: string; customer?: string; payment: Record<string, unknown> };
  profile_id: string | null;
}

export function emailConfiguration() {
  const recipient = process.env.ADMIN_NOTIFICATION_EMAIL?.trim() || ''
  const sender = process.env.RESEND_FROM_EMAIL?.trim() || ''
  return { configured: Boolean(process.env.RESEND_API_KEY && recipient && sender), recipient, sender }
}

export function paymentEmail(event: Event, customer: string) {
  const payment = event.payload.payment
  const method = String(payment.payment_method || '')
  const crypto = isCryptoMethod(method) ? CRYPTO_METHODS[method] : null
  const manual = event.payload.source === 'manual_payment_claims'
  const status = String(payment.status)
  const title = manual && status === 'pending' ? 'Payment submitted — review required' : `Payment ${status}`
  const amount = payment.approved_amount_xaf ?? payment.amount_xaf ?? payment.amount
  return {
    subject: `Premium Verific: ${title}`,
    text: [
      title, `Customer: ${customer}`, `Customer profile: ${event.profile_id}`,
      `Method: ${crypto?.label || method}`, `Wallet amount: ${amount} XAF`,
      ...(crypto ? [`Crypto amount claimed: ${payment.crypto_amount} ${crypto.asset}`, `Destination: ${payment.receiving_address}`] : []),
      `Reference: ${payment.transfer_reference || payment.reference}`,
      `Record: ${event.payload.record_id}`, `Type: ${payment.type || 'manual deposit'}`,
      manual && status === 'pending'
        ? 'This is a customer claim, NOT confirmation that Binance received funds. Verify the credited deposit, network, amount and customer ownership before approving.'
        : 'Check the ledger and payment details in the administrator portal.',
      'Review: https://admin.premiumverific.com/admin',
    ].join('\n'),
  }
}

// Errors never roll back a payment. Unsent events stay in the durable outbox.
export async function dispatchAdminNotifications(admin: SupabaseClient, limit = 1) {
  const config = emailConfiguration()
  if (!config.configured) return { sent: 0, pending_configuration: true }
  let sent = 0
  let failed = 0
  try {
    for (let index = 0; index < Math.min(limit, 3); index++) {
      if (index) await new Promise(resolve => setTimeout(resolve, 650))
      const { data, error } = await admin.rpc('reserve_admin_notification', { p_sender: config.sender, p_recipient: config.recipient })
      if (error) return { sent, failed, schema_missing: true }
      const event = data?.[0] as Event | undefined
      if (!event) break
      try {
        const email = paymentEmail(event, event.payload.customer || 'Unknown customer')
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST', headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json', 'Idempotency-Key': `admin-event/${event.id}` },
          body: JSON.stringify({ from: event.sender, to: [event.recipient], ...email }), signal: AbortSignal.timeout(8000),
        })
        const result = await response.json().catch(() => ({}))
        if (!response.ok || !result.id) throw new Error(`Email provider rejected request (HTTP ${response.status}). Check Resend configuration.`)
        const { error: saveError } = await admin.from('admin_notification_outbox')
          .update({ sent_at: new Date().toISOString(), resend_id: result.id, last_error: null, lease_until: null }).eq('id', event.id)
        if (saveError) throw new Error('Email accepted, but delivery record could not be saved.')
        sent++
      } catch (error) {
        failed++
        await admin.from('admin_notification_outbox').update({ last_error: error instanceof Error ? error.message : 'Email attempt failed.' }).eq('id', event.id)
      }
    }
    return { sent, failed }
  } catch { return { sent, failed: failed + 1 } }
}

export function scheduleAdminNotifications(admin: SupabaseClient) {
  after(async () => { await dispatchAdminNotifications(admin, 3) })
}
