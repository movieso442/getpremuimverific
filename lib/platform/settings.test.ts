import { test } from 'node:test'
import assert from 'node:assert/strict'
import { retailPrice, smmRetailRateXaf } from './settings'
test('SMS and social retail prices include the 2% increase once, including overrides', () => {
  assert.equal(retailPrice(100, 3), 306)
  assert.equal(retailPrice(105, 3), 322)
  assert.equal(smmRetailRateXaf(1, 3), 1836)
  assert.equal(smmRetailRateXaf(1, 3, { service_id: 1, retail_rate_xaf: 1200, is_active: true }), 1224)
})
