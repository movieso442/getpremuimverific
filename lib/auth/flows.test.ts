import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mobileReturnUrl, safeNextPath, webAuthCallback, signupNotice, authErrorMessage } from './flows'

const state = '11111111-1111-4111-8111-111111111111'
test('website callbacks keep navigation on the application origin', () => {
  for (const bad of ['//evil.test', 'https://evil.test', '/\\evil.test', '/\n/evil.test', 'javascript:alert(1)', '']) assert.equal(safeNextPath(bad), '/dashboard')
  assert.equal(safeNextPath('/orders?status=pending'), '/orders?status=pending')
  const callback = new URL(webAuthCallback('https://premiumverific.com', '//evil.test'))
  assert.equal(callback.pathname, '/auth/callback'); assert.equal(callback.searchParams.get('next'), '/dashboard')
})
test('HTTPS app bridge relays only a code and nonce to the fixed app scheme', () => {
  const callback = mobileReturnUrl('?code=valid-code&app_state=' + state + '&next=https://evil.test')
  assert.equal(new URL(callback!).protocol, 'premiumverify:')
  assert.equal(new URL(callback!).hostname, 'auth')
  assert.equal(new URL(callback!).pathname, '/callback')
  assert.equal(new URL(callback!).searchParams.get('next'), null)
  for (const query of ['?code=a', '?app_state=' + state, '?code=a&app_state=invalid', '?code=a&app_state=' + state + '&access_token=secret', '?code=a&app_state=' + state + '&refresh_token=secret', '?error=access_denied&code=a&app_state=' + state]) assert.equal(mobileReturnUrl(query), null)
})
test('signup messages do not promise delivery to an existing Google account', () => {
  assert.ok(signupNotice.includes('another signup email may not be sent'))
  assert.ok(authErrorMessage({ code: 'email_address_not_authorized' }).includes('not configured'))
  assert.ok(authErrorMessage({ code: 'over_email_send_rate_limit' }).includes('wait'))
})
