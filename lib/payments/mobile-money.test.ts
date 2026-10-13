import { test } from 'node:test'
import assert from 'node:assert/strict'
import { cameroonPhone, depositXaf, mobileMoneyMethod } from './mobile-money'
import { requestMobileMoney, reconcilePayunit } from './payunit-direct'
import { getPayunitConfig } from './payunit'
import type { SupabaseClient } from '@supabase/supabase-js'

test('phone normalization accepts local and international Cameroon numbers only', () => {
  for (const number of ['677034736', '+237 677 034 736', '00237677034736']) assert.equal(cameroonPhone(number), '677034736')
  for (const number of ['123', '+1 677034736', '677034736<script>', '', 677034736]) assert.equal(cameroonPhone(number), null)
})
test('wallet deposit boundaries and operator whitelist reject invalid inputs', () => {
  assert.equal(depositXaf(5, 'USD'), 3000)
  assert.equal(depositXaf(3000), 3000)
  for (const value of [2999, 2999.6, 0, -1, Infinity, NaN, 10000001, '5000']) assert.equal(depositXaf(value), null)
  assert.equal(depositXaf(4.999, 'USD'), null)
  assert.equal(depositXaf(5000, 'EUR'), null)
  assert.equal(mobileMoneyMethod('mtn_momo'), true)
  assert.equal(mobileMoneyMethod('orange_money'), true)
  assert.equal(mobileMoneyMethod('visa_mastercard'), false)
})
const config = { appId: 'test-app', appUrl: 'https://example.test', mode: 'test', apiKey: 'fake', baseUrl: 'https://example.test', headers: { 'x-api-key': 'fake', mode: 'test', 'Content-Type': 'application/json', Authorization: 'Basic fake' } } as NonNullable<ReturnType<typeof getPayunitConfig>>
test('direct checkout sends the selected operator once and never sends a PIN', async () => {
  const previous = globalThis.fetch
  try {
    for (const method of ['mtn_momo', 'orange_money'] as const) {
      const calls: { url: string; body: Record<string, unknown> }[] = []
      globalThis.fetch = async (url, options) => {
        calls.push({ url: String(url), body: JSON.parse(String(options?.body)) })
        return Response.json({ status: 'SUCCESS', data: { payment_status: 'PENDING' } })
      }
      assert.deepEqual(await requestMobileMoney(config, { amount: 3000, reference: 'PV-test', phone: '677034736', method, returnPath: '/add-funds' }), { accepted: true })
      assert.equal(calls.length, 2)
      assert.ok(calls[1].url.endsWith('/makepayment'))
      assert.equal(calls[1].body.gateway, method === 'mtn_momo' ? 'CM_MTNMOMO' : 'CM_ORANGE')
      assert.equal(calls[1].body.phone_number, '677034736')
      assert.equal(calls[1].body.amount, 3000)
      assert.equal(calls[1].body.paymentType, 'button')
      assert.equal('pin' in calls[1].body, false)
    }
  } finally { globalThis.fetch = previous }
})
test('operator timeouts are uncertain and never retried automatically', async () => {
  const previous = globalThis.fetch
  let calls = 0
  globalThis.fetch = async () => { if (++calls === 1) return Response.json({ status: 'SUCCESS' }); throw new Error('timeout') }
  try {
    assert.deepEqual(await requestMobileMoney(config, { amount: 3000, reference: 'PV-test', phone: '677034736', method: 'mtn_momo', returnPath: '/add-funds' }), { accepted: false, uncertain: true })
    assert.equal(calls, 2)
  } finally { globalThis.fetch = previous }
})
test('initialization rejection never sends a phone payment request', async () => {
  const previous = globalThis.fetch
  let calls = 0
  globalThis.fetch = async () => { calls++; return Response.json({ status: 'FAILED' }, { status: 400 }) }
  try {
    const result = await requestMobileMoney(config, { amount: 3000, reference: 'PV-test', phone: '677034736', method: 'orange_money', returnPath: '/add-funds' })
    assert.equal(result.accepted, false)
    assert.equal(result.uncertain, undefined)
    assert.equal(calls, 1)
  } finally { globalThis.fetch = previous }
})
test('wallet reconciliation requires matching reference, amount, currency and final status', async () => {
  const previousFetch = globalThis.fetch
  const previousEnv = { ...process.env }
  Object.assign(process.env, { PAYUNIT_MODE: 'test', PAYUNIT_APP_ID: 'fake', PAYUNIT_API_USER: 'fake', PAYUNIT_API_PASSWORD: 'fake', PAYUNIT_API_KEY: 'fake', NEXT_PUBLIC_APP_URL: 'https://example.test' })
  const transaction = { id: 'ledger-test', reference: 'PV-test', amount: 3000, status: 'pending' }
  let updates: string[] = []
  const database = { from: () => ({ update: (fields: { status: string }) => {
    updates.push(fields.status)
    return { eq: (firstKey: string, firstValue: string) => { assert.equal(firstKey, 'id'); assert.equal(firstValue, 'ledger-test'); return { eq: (key: string, value: string) => {
      assert.equal(key, 'status'); assert.equal(value, 'pending')
      return { select: () => ({ maybeSingle: async () => ({ data: { status: fields.status }, error: null }) }) }
    } } } }
  } }) } as unknown as SupabaseClient
  const exact = { transaction_id: 'PV-test', transaction_amount: 3000, transaction_currency: 'XAF', transaction_status: 'SUCCESS' }
  try {
    for (const details of [{ ...exact, transaction_amount: 5000 }, { ...exact, transaction_id: 'other' }, { ...exact, transaction_currency: 'USD' }, { ...exact, transaction_status: 'PENDING' }]) {
      globalThis.fetch = async () => Response.json({ status: 'SUCCESS', data: details })
      assert.equal(await reconcilePayunit(database, transaction), 'pending')
      assert.deepEqual(updates, [])
    }
    globalThis.fetch = async () => Response.json({ status: 'SUCCESS', data: exact })
    assert.equal(await reconcilePayunit(database, transaction), 'completed')
    assert.deepEqual(updates, ['completed'])
    updates = []
    assert.equal(await reconcilePayunit(database, { ...transaction, service_fee_xaf: 60 }), 'pending')
    assert.deepEqual(updates, [])
    globalThis.fetch = async () => Response.json({ status: 'SUCCESS', data: { ...exact, transaction_amount: 3060 } })
    assert.equal(await reconcilePayunit(database, { ...transaction, service_fee_xaf: 60 }), 'completed')
    assert.deepEqual(updates, ['completed'])
    updates = []
    assert.equal(await reconcilePayunit(database, { ...transaction, status: 'completed' }), 'completed')
    assert.deepEqual(updates, [])
    globalThis.fetch = async () => Response.json({ status: 'SUCCESS', data: { ...exact, transaction_status: 'CANCELLED' } })
    assert.equal(await reconcilePayunit(database, transaction), 'failed')
    assert.deepEqual(updates, ['failed'])
  } finally {
    globalThis.fetch = previousFetch
    for (const key of Object.keys(process.env)) if (!(key in previousEnv)) delete process.env[key]
    Object.assign(process.env, previousEnv)
  }
})
