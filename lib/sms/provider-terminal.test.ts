import { test } from 'node:test'
import assert from 'node:assert/strict'
import { unusedActivationFinalStatus } from './provider-terminal'
import { meetsSmsDeliveryThreshold } from '../providers/fivesim'

test('maps code-free supplier terminal states to local order states', () => {
  assert.equal(unusedActivationFinalStatus('CANCELED', []), 'canceled')
  assert.equal(unusedActivationFinalStatus('BANNED', []), 'canceled')
  assert.equal(unusedActivationFinalStatus('TIMEOUT', []), 'expired')
})

test('does not settle non-terminal, unknown, or code-bearing responses', () => {
  assert.equal(unusedActivationFinalStatus('RECEIVING', []), null)
  assert.equal(unusedActivationFinalStatus('TIMEOUT', undefined), null)
  assert.equal(unusedActivationFinalStatus('BANNED', [{ code: '123456' }]), null)
})

test('SMS quote reliability threshold rejects low, missing, and invalid rates', () => {
  assert.equal(meetsSmsDeliveryThreshold(50), true)
  assert.equal(meetsSmsDeliveryThreshold(50.01), true)
  assert.equal(meetsSmsDeliveryThreshold(49.99), false)
  assert.equal(meetsSmsDeliveryThreshold(undefined), false)
  assert.equal(meetsSmsDeliveryThreshold(Number.NaN), false)
})
