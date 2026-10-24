import { test } from 'node:test'
import assert from 'node:assert/strict'
import { retailPrice, smmRetailRateXaf } from './settings'
test('SMS and social retail prices include the existing 2% plus 1% extra markup', () => {
  assert.equal(retailPrice(100, 3), 309)
  assert.equal(retailPrice(105, 3), 325)
  assert.equal(smmRetailRateXaf(1, 3), 1854)
  assert.equal(smmRetailRateXaf(1, 3, { service_id: 1, retail_rate_xaf: 1200, is_active: true }), 1236)
})
