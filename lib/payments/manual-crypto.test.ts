import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { CRYPTO_METHODS, isCryptoMethod, validCryptoAmount, validCryptoHash } from './manual-crypto'

test('USDT and BTC addresses transcribed from customer images have valid Base58Check checksums', () => {
  const alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
  for (const [method, prefix] of [['usdt_trc20', 0x41], ['btc_bitcoin', 0x00]] as const) {
    const address = CRYPTO_METHODS[method].address
    let decoded = BigInt(0)
    for (const char of address) {
      const digit = alphabet.indexOf(char)
      assert.ok(digit >= 0)
      decoded = decoded * BigInt(58) + BigInt(digit)
    }
    let hex = decoded.toString(16)
    if (hex.length % 2) hex = '0' + hex
    const bytes = Buffer.concat([Buffer.alloc(address.match(/^1*/)?.[0].length || 0), Buffer.from(hex, 'hex')])
    assert.equal(bytes.length, 25)
    assert.equal(bytes[0], prefix)
    const digest = createHash('sha256').update(createHash('sha256').update(bytes.subarray(0, -4)).digest()).digest()
    assert.deepEqual(bytes.subarray(-4), digest.subarray(0, 4))
  }
})

test('network-specific transaction hashes and precision are enforced', () => {
  const hash = 'a'.repeat(64)
  assert.equal(validCryptoHash('usdt_trc20', hash), true)
  assert.equal(validCryptoHash('btc_bitcoin', hash), true)
  assert.equal(validCryptoHash('usdt_trc20', '0x' + hash), false)
  assert.equal(validCryptoHash('eth_erc20', hash), false)
  assert.equal(validCryptoHash('eth_erc20', '0x' + hash), true)
  assert.equal(validCryptoHash('btc_bitcoin', 'z'.repeat(64)), false)
  assert.equal(validCryptoAmount('usdt_trc20', '5.123456'), true)
  assert.equal(validCryptoAmount('usdt_trc20', '5.1234567'), false)
  assert.equal(validCryptoAmount('btc_bitcoin', '0.00000001'), true)
  assert.equal(validCryptoAmount('btc_bitcoin', '0.000000001'), false)
  assert.equal(validCryptoAmount('usdt_trc20', '0'), false)
  assert.equal(validCryptoAmount('usdt_trc20', '-5'), false)
  assert.equal(validCryptoAmount('usdt_trc20', '1e3'), false)
  assert.equal(isCryptoMethod('usdt_trc20'), true)
  assert.equal(isCryptoMethod('toString'), false)
})
