import { test } from 'node:test'
import assert from 'node:assert/strict'
import { androidRelease, iphoneRelease } from './releases'

const android = { APP_ANDROID_APK_URL: 'https://downloads.example.com/premium-verify.apk', APP_ANDROID_APK_SHA256: 'A'.repeat(64), APP_MOBILE_VERSION: '0.1.0' }
test('Android downloads require all release metadata', () => {
  assert.equal(androidRelease({}), null)
  assert.equal(androidRelease({ ...android, APP_ANDROID_APK_SHA256: '' }), null)
  assert.equal(androidRelease({ ...android, APP_MOBILE_VERSION: 'soon' }), null)
  assert.equal(androidRelease(android)?.checksum, 'a'.repeat(64))
})
test('Android rejects insecure, credential-bearing and non-APK links', () => {
  for (const url of ['http://example.com/app.apk', 'javascript:alert(1)', 'https://user:password@example.com/app.apk', 'https://example.com/app.aab']) {
    assert.equal(androidRelease({ ...android, APP_ANDROID_APK_URL: url }), null)
  }
})
test('iPhone accepts only Apple distribution links, not raw IPA files', () => {
  assert.equal(iphoneRelease({}), null)
  for (const url of ['https://example.com/app.ipa', 'https://testflight.apple.com.evil.example/join/abcd', 'http://testflight.apple.com/join/abcd', 'https://user:pass@testflight.apple.com/join/abcd']) {
    assert.equal(iphoneRelease({ APP_IOS_INSTALL_URL: url }), null)
  }
  assert.equal(iphoneRelease({ APP_IOS_INSTALL_URL: 'https://testflight.apple.com/join/abcd1234' })?.type, 'testflight')
  assert.equal(iphoneRelease({ APP_IOS_INSTALL_URL: 'https://apps.apple.com/us/app/premium/id12345678' })?.type, 'app-store')
})
