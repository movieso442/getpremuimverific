import { test } from 'node:test'
import assert from 'node:assert/strict'
import { topupQuote } from './topup-fees'
test('2% is added on top and never added to the customer balance', () => {
  assert.deepEqual(topupQuote(5000), { creditXaf: 5000, feeXaf: 100, totalXaf: 5100 })
  assert.deepEqual(topupQuote(3001), { creditXaf: 3001, feeXaf: 61, totalXaf: 3062 })
  for (const method of ['mtn_momo', 'orange_money']) assert.deepEqual(topupQuote(5000, method), { creditXaf: 5000, feeXaf: 0, totalXaf: 5000 })
  for (const value of [2999, 10000001, NaN, 3000.5]) assert.throws(() => topupQuote(value))
})
test('card fee is 1.4%, rounded to whole XAF, separate from wallet credit', () => {
  assert.deepEqual(topupQuote(5000, 'payunit_card'), { creditXaf: 5000, feeXaf: 70, totalXaf: 5070 })
  assert.deepEqual(topupQuote(3001, 'payunit_card'), { creditXaf: 3001, feeXaf: 43, totalXaf: 3044 })
  assert.deepEqual(topupQuote(100000, 'payunit_card'), { creditXaf: 100000, feeXaf: 1400, totalXaf: 101400 })
})
