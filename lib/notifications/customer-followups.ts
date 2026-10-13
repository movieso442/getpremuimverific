import type { SupabaseClient } from '@supabase/supabase-js'
import { after } from 'next/server'

type Event = { id: string; profile_id: string; recipient: string; sender: string; reply_to: string; unsubscribe_token: string; email_text: string | null; email_subject: string | null }
export function customerFollowupEmail(token: string) {
  return {
    subject: 'Need help with your Premium Verific top-up?',
    text: [
      'Hi, did you run into an issue while topping up? Reply to this email or contact us on WhatsApp: https://wa.me/237677034736.',
      'If you already approved a payment, please do not pay again while it is being checked.',
      'Premium Verific Support',
      `Stop these help emails: https://premiumverific.com/email-preferences?token=${token}`,
    ].join('\n\n'),
  }
}
export async function dispatchCustomerFollowups(admin: SupabaseClient, limit = 5) {
  const sender = process.env.RESEND_FROM_EMAIL?.trim()
  const replyTo = process.env.CUSTOMER_FOLLOWUP_REPLY_TO?.trim() || 'hello@premiumverific.com'
  if (process.env.CUSTOMER_FOLLOWUP_EMAILS_ENABLED !== 'true' || !sender || !process.env.RESEND_API_KEY) return { sent: 0, disabled: true }
  let sent = 0, failed = 0, skipped = 0
  for (let index = 0; index < Math.min(limit, 5); index++) {
    if (index) await new Promise(resolve => setTimeout(resolve, 650))
    const { data, error } = await admin.rpc('reserve_customer_followup', { p_sender: sender, p_reply_to: replyTo })
    if (error) return { sent, failed, skipped, schema_missing: true }
    const event = data?.[0] as Event | undefined
    if (!event) break
    try {
      // Recheck preference, payment outcome and verified identity immediately
      // before sending; do not trust browser-supplied emails or statuses.
      const { data: state, error: stateError } = await admin.from('customer_checkout_followups').select('state,created_at').eq('id', event.id).single()
      const { data: preference, error: prefError } = await admin.from('customer_email_preferences').select('followups_enabled').eq('profile_id', event.profile_id).single()
      const { data: profile, error: profileError } = await admin.from('profiles').select('user_id').eq('id', event.profile_id).single()
      if (stateError || prefError || profileError || !profile?.user_id) throw new Error('Could not verify customer follow-up eligibility.')
      const { data: identity, error: identityError } = await admin.auth.admin.getUserById(profile.user_id)
      const { data: payment, error: paymentError } = await admin.from('wallet_transactions').select('id').eq('profile_id', event.profile_id).eq('type', 'deposit').eq('status', 'completed').gte('created_at', state.created_at).limit(1).maybeSingle()
      if (identityError || paymentError) throw new Error('Could not verify customer follow-up eligibility.')
      if (state.state === 'completed' || !preference.followups_enabled || payment || !identity.user?.email_confirmed_at || identity.user.is_anonymous || identity.user.email !== event.recipient) {
        await admin.from('customer_checkout_followups').update({ state: 'completed', lease_until: null }).eq('id', event.id)
        skipped++; continue
      }
      const email = customerFollowupEmail(event.unsubscribe_token)
      const text = event.email_text || email.text
      const subject = event.email_subject || email.subject
      if (!event.email_text || !event.email_subject) {
        const { error: saveError } = await admin.from('customer_checkout_followups').update({ email_text: text, email_subject: subject }).eq('id', event.id)
        if (saveError) throw new Error('Could not save the follow-up before delivery.')
      }
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST', headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json', 'Idempotency-Key': `customer-help/${event.id}` },
        body: JSON.stringify({ from: event.sender, to: [event.recipient], reply_to: [event.reply_to], subject, text }), signal: AbortSignal.timeout(8000),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok || !result.id) throw new Error(`Email delivery failed (HTTP ${response.status}).`)
      const { error: saveError } = await admin.from('customer_checkout_followups').update({ sent_at: new Date().toISOString(), resend_id: result.id, lease_until: null, last_error: null }).eq('id', event.id)
      if (saveError) throw new Error('Email accepted but its delivery record was not saved.')
      sent++
    } catch (reason) {
      failed++
      await admin.from('customer_checkout_followups').update({ last_error: reason instanceof Error ? reason.message : 'Email delivery failed.' }).eq('id', event.id)
    }
  }
  return { sent, failed, skipped }
}
export function scheduleCustomerFollowups(admin: SupabaseClient) {
  after(async () => { await dispatchCustomerFollowups(admin, 1) })
}
