// Pure callback checks; no native runtime, account creation or provider calls.
import assert from 'node:assert/strict'
import {isNativeAuthUrl,nativeAuthCode,nativeBridgeUrl} from '../mobile/src/auth-links.ts'
const state='11111111-1111-4111-8111-111111111111'
const now=10000000,pending={state,createdAt:now,kind:'oauth'}
const link='premiumverify://auth/callback?code=test-code&app_state='+state
assert.equal(isNativeAuthUrl(link),true)
assert.equal(nativeAuthCode(link,pending,now),'test-code')
const appLink='https://premiumverific.com/auth/mobile-callback?code=test-code&app_state='+state
assert.equal(nativeAuthCode(appLink,{...pending,kind:'signup'},now),'test-code')
assert.throws(()=>nativeAuthCode(appLink.replace('premiumverific.com','evil.test'),pending,now))
assert.throws(()=>nativeAuthCode(appLink+'#access_token=secret',pending,now))
assert.throws(()=>nativeAuthCode(link,null,now))
assert.throws(()=>nativeAuthCode(link,{...pending,state:'different'},now))
assert.throws(()=>nativeAuthCode(link,pending,now+900001))
assert.throws(()=>nativeAuthCode(link,{...pending,createdAt:NaN},now))
assert.throws(()=>nativeAuthCode(link+'#access_token=secret',pending,now))
for(const other of [link.replace('premiumverify:','https:'),link.replace('auth/','evil/'),link.replace('/callback','/other')])assert.throws(()=>nativeAuthCode(other,pending,now))
assert.equal(new URL(nativeBridgeUrl('https://premiumverific.com',state)).pathname,'/auth/mobile-callback')
assert.throws(()=>nativeBridgeUrl('http://evil.test',state))
console.log('PASS native auth: exact scheme/path, nonce, request age, no token relay, and HTTPS bridge origin.')
