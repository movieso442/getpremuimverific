import { test } from 'node:test'
import assert from 'node:assert/strict'
import { customerFollowupEmail } from './customer-followups'
test('help email is short, includes support/opt-out and never asks to pay again', () => {
  const email = customerFollowupEmail('a'.repeat(64))
  assert.ok(email.text.split(/\s+/).length < 90)
  assert.match(email.text, /please do not pay again/)
  assert.match(email.text, /wa.me\/237640796062/)
  assert.match(email.text, /email-preferences\?token=a{64}/)
  assert.doesNotMatch(email.text, /payment (failed|cancelled)/i)
})
