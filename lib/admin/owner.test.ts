import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ADMIN_OWNER_EMAIL, isVerifiedOwner } from './owner'

test('only the confirmed owner email grants administrator access', () => {
  assert.equal(isVerifiedOwner({ email: ADMIN_OWNER_EMAIL, email_confirmed_at: '2026-10-10' }), true)
  assert.equal(isVerifiedOwner({ email: ADMIN_OWNER_EMAIL.toUpperCase(), email_confirmed_at: '2026-10-10' }), true)
  assert.equal(isVerifiedOwner({ email: ADMIN_OWNER_EMAIL }), false)
  assert.equal(isVerifiedOwner({ email: 'other@example.com', email_confirmed_at: '2026-10-10' }), false)
  assert.equal(isVerifiedOwner({ email: ADMIN_OWNER_EMAIL, email_confirmed_at: '2026-10-10', is_anonymous: true }), false)
  assert.equal(isVerifiedOwner(null), false)
})
