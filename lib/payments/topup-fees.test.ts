import { test } from 'node:test'
import assert from 'node:assert/strict'
import { topupQuote } from './topup-fees'
test('2% is added on top and never added to the customer balance', () => {
  assert.deepEqual(topupQuote(5000), { creditXaf: 5000, feeXaf: 100, totalXaf: 5100 })
  assert.deepEqual(topupQuote(3001), { creditXaf: 3001, feeXaf: 61, totalXaf: 3062 })
  for (const method of ['mtn_momo', 'orange_money']) assert.deepEqual(topupQuote(5000, method), { creditXaf: 5000, feeXaf: 0, totalXaf: 5000 })
  for (const value of [2999, 10000001, NaN, 3000.5]) assert.throws(() => topupQuote(value))
})
