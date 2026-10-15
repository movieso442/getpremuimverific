import { test } from 'node:test'
import assert from 'node:assert/strict'
import { cardAmount, cardProof, hostedCardUrl } from './cards'
import { initializeCardCheckout, reconcileCard } from './payunit-cards'
import type { SupabaseClient } from '@supabase/supabase-js'

const checkoutId = 'PU_LIVE_11111111-1111-4111-8111-111111111111'
const reference = 'PC123456789abcdef12'
const expected = { checkoutId, reference, amount: 5070 }
const payload = () => ({ status: 'SUCCESS', data: { checkout_id: checkoutId, transaction_id: reference, total_amount: 5070, currency: 'XAF', checkout_mode: 'LIVE', status: 'SUCCESS' } })
test('only the fixed HTTPS checkout origin and valid card amounts are accepted', () => {
  for (const amount of [3000, 5000, 100000]) assert.equal(cardAmount(amount), true)
  for (const amount of [2999, 100001, '5000', NaN, Infinity, 5000.5]) assert.equal(cardAmount(amount), false)
  const url = `https://checkout.payunit.net/${checkoutId}`
  assert.equal(hostedCardUrl(url, checkoutId)?.url, url)
  for (const bad of [url.replace('https:', 'http:'), url.replace('payunit.net', 'payunit.net.evil.test'), url + '?redirect=evil', url + '#evil', url.replace('PU_LIVE', 'PU_TEST'), url.replace('https://', 'https://evil@')]) assert.equal(hostedCardUrl(bad), null)
  assert.equal(hostedCardUrl(url, 'other'), null)
})
test('payment proof must match gross amount, reference, checkout, currency and live mode', () => {
  assert.equal(cardProof(payload(), expected)?.status, 'SUCCESS')
  const initiated = payload(); initiated.data.status = 'INITIATED'
  assert.equal(cardProof(initiated, expected)?.status, 'PENDING')
  for (const [field, value] of Object.entries({ checkout_id: 'other', transaction_id: 'other', total_amount: 5000, currency: 'USD', checkout_mode: 'TEST', status: 'REFUNDED' })) {
    const bad = payload(); Object.assign(bad.data, { [field]: value })
    assert.equal(cardProof(bad, expected), null, field)
  }
  for (const bad of [null, {}, { ...payload(), status: 'FAILED' }]) assert.equal(cardProof(bad, expected), null)
})
test('authenticated provider check includes the fee; spoofed results never call finalize', async () => {
  const originalFetch = global.fetch
  const names = ['PAYUNIT_MODE', 'PAYUNIT_APP_ID', 'PAYUNIT_API_USER', 'PAYUNIT_API_PASSWORD', 'PAYUNIT_LIVE_KEY', 'NEXT_PUBLIC_APP_URL']
  const old = names.map(name => process.env[name])
  Object.assign(process.env, { PAYUNIT_MODE: 'live', PAYUNIT_APP_ID: 'test-app', PAYUNIT_API_USER: 'test-user', PAYUNIT_API_PASSWORD: 'test-password', PAYUNIT_LIVE_KEY: 'test-key', NEXT_PUBLIC_APP_URL: 'https://premiumverific.com' })
  let finalized = 0
  const admin = { rpc: async (name: string, args: Record<string, unknown>) => {
    if (name === 'claim_card_verification') return { data: checkoutId, error: null }
    assert.equal(name, 'finalize_card_topup'); assert.equal(args.p_amount, 5070); finalized++
    return { data: 'completed', error: null }
  } } as unknown as SupabaseClient
  const transaction = { reference, amount: 5000, service_fee_xaf: 70, status: 'pending' }
  try {
    global.fetch = async (input, init) => {
      assert.equal(String(input), `https://gateway.payunit.net/api/gateway/checkout/status/${checkoutId}`)
      assert.equal(new Headers(init?.headers).get('mode'), 'live')
      assert.equal(init?.redirect, 'error')
      return Response.json(payload())
    }
    assert.equal(await reconcileCard(admin, transaction), 'completed'); assert.equal(finalized, 1)
    const bad = payload(); bad.data.total_amount = 5000
    global.fetch = async () => Response.json(bad)
    assert.equal(await reconcileCard(admin, transaction), 'pending'); assert.equal(finalized, 1)
    process.env.PAYUNIT_MODE = 'test'
    assert.equal(await reconcileCard(admin, transaction), 'pending'); assert.equal(finalized, 1)
    process.env.PAYUNIT_MODE = 'live'
    global.fetch = async (_url, init) => {
      const body = JSON.parse(String(init?.body))
      assert.equal(body.total_amount, 5070); assert.equal(body.currency, 'XAF')
      assert.ok(body.notify_url.startsWith('https://premiumverific.com/'))
      assert.equal('card_info' in body, false)
      return Response.json({ status: 'SUCCESS', data: { checkout_id: checkoutId, redirect: `https://checkout.payunit.net/${checkoutId}` } })
    }
    assert.equal((await initializeCardCheckout(reference, 5070)).checkoutId, checkoutId)
  } finally {
    global.fetch = originalFetch
    names.forEach((name, index) => { if (old[index] === undefined) delete process.env[name]; else process.env[name] = old[index] })
  }
})
