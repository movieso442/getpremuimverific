import { test } from 'node:test'
import assert from 'node:assert/strict'
import { topupCommand } from './topup-command'
test('plain top up and amount commands never fall through to greeting', () => {
  for (const value of ['Top up', 'TOP  UP', 'topup', '/pay', 'deposit', 'Add funds', 'recharge']) assert.deepEqual(topupCommand(value), { amount: null })
  for (const value of ['top up 5000', '/pay 5000', 'topup 5000', 'add funds 5000']) assert.deepEqual(topupCommand(value), { amount: 5000 })
  assert.equal(topupCommand('hello'), null)
  assert.equal(topupCommand('payment failed'), null)
})
