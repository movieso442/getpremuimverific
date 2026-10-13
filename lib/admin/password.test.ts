import { test } from 'node:test'
import assert from 'node:assert/strict'
import { matchesAdminPassword } from './password'

test('configured admin password must match exactly, including whitespace', () => {
  assert.equal(matchesAdminPassword('test-only-secret', 'test-only-secret'), true)
  assert.equal(matchesAdminPassword('wrong', 'test-only-secret'), false)
  assert.equal(matchesAdminPassword('test-only-secret ', 'test-only-secret'), false)
  assert.equal(matchesAdminPassword('', 'test-only-secret'), false)
})
test('omitting the env gate preserves normal Supabase owner-password authentication', () => {
  assert.equal(matchesAdminPassword('test-only-secret', undefined), true)
})
