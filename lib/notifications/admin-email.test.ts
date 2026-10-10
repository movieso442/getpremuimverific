import { test } from 'node:test'
import assert from 'node:assert/strict'
import { paymentEmail, emailConfiguration, dispatchAdminNotifications } from './admin-email'
import type { SupabaseClient } from '@supabase/supabase-js'

const event = {
  id: 'event-1', recipient: 'admin@example.com', sender: 'notifications@example.com', attempts: 1, profile_id: 'customer-1',
  payload: { source: 'manual_payment_claims', record_id: 'claim-1', payment: {
    status: 'pending', payment_method: 'usdt_trc20', crypto_amount: '5', amount_xaf: 3000,
    receiving_address: 'TRON-ADDRESS', transfer_reference: 'TX-HASH',
  } },
}
test('crypto claim email distinguishes submission from verified receipt', () => {
  const email = paymentEmail(event, 'Customer / customer@example.com')
  assert.match(email.subject, /review required/)
  assert.match(email.text, /NOT confirmation/)
  assert.match(email.text, /5 USDT/)
  assert.match(email.text, /3000 XAF/)
  assert.match(email.text, /Customer \/ customer@example.com/)
  assert.match(email.text, /TX-HASH/)
  assert.match(email.text, /https:\/\/admin.premiumverific.com\/admin/)
})
test('confirmed notification uses the approved XAF amount', () => {
  const email = paymentEmail({ ...event, payload: { ...event.payload, payment: { ...event.payload.payment, status: 'confirmed', approved_amount_xaf: 3200 } } }, 'Customer')
  assert.match(email.subject, /confirmed/)
  assert.match(email.text, /3200 XAF/)
  assert.doesNotMatch(email.subject, /review required/)
})
test('absent Resend API key is reported as unconfigured', () => {
  const previous = process.env.RESEND_API_KEY
  delete process.env.RESEND_API_KEY
  try { assert.equal(emailConfiguration().configured, false) }
  finally { if (previous !== undefined) process.env.RESEND_API_KEY = previous }
})

test('dispatcher uses an idempotency key and records acceptance, without a live email', async () => {
  const previous = { key: process.env.RESEND_API_KEY, sender: process.env.RESEND_FROM_EMAIL, recipient: process.env.ADMIN_NOTIFICATION_EMAIL }
  const originalFetch = globalThis.fetch
  const updates: Array<Record<string, unknown>> = []
  process.env.RESEND_API_KEY = 'test-key'
  process.env.RESEND_FROM_EMAIL = 'notifications@example.com'
  process.env.ADMIN_NOTIFICATION_EMAIL = 'admin@example.com'
  const admin = {
    rpc: async () => ({ data: [event], error: null }),
    from: () => ({ update: (fields: Record<string, unknown>) => ({ eq: async () => { updates.push(fields); return { error: null } } }) }),
  } as unknown as SupabaseClient
  globalThis.fetch = async (_input, init) => {
    assert.equal((init?.headers as Record<string, string>)['Idempotency-Key'], 'admin-event/event-1')
    assert.equal(JSON.parse(String(init?.body)).to[0], 'admin@example.com')
    return Response.json({ id: 'email-1' })
  }
  try {
    assert.deepEqual(await dispatchAdminNotifications(admin), { sent: 1, failed: 0 })
    assert.equal(updates[0].resend_id, 'email-1')
    assert.ok(updates[0].sent_at)
    globalThis.fetch = async () => Response.json({ error: 'rejected' }, { status: 403 })
    assert.deepEqual(await dispatchAdminNotifications(admin), { sent: 0, failed: 1 })
    assert.match(String(updates[1].last_error), /HTTP 403/)
    assert.equal(updates[1].sent_at, undefined)
  } finally {
    globalThis.fetch = originalFetch
    for (const [name, value] of [['RESEND_API_KEY', previous.key], ['RESEND_FROM_EMAIL', previous.sender], ['ADMIN_NOTIFICATION_EMAIL', previous.recipient]]) {
      if (value === undefined) delete process.env[name!]; else process.env[name!] = value
    }
  }
})
