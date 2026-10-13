import { test } from 'node:test'
import assert from 'node:assert/strict'
import { countryCurrency, isDisplayCurrency } from './local-currency'
test('country display defaults and validated overrides', () => {
  for (const [country, currency] of [['CM', 'XAF'], ['NG', 'NGN'], ['GH', 'GHS'], ['US', 'USD'], ['ng', 'NGN']]) assert.equal(countryCurrency(country), currency)
  assert.equal(countryCurrency(null), 'USD')
  assert.equal(isDisplayCurrency('NGN'), true)
  assert.equal(isDisplayCurrency('AUTO'), false)
})
