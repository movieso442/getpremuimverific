import { test } from 'node:test'
import assert from 'node:assert/strict'
import { normalizeCryptoReference } from './crypto-reference'
test('accepts plain references and the selected network explorer only', () => {
  const hash = 'a'.repeat(64)
  assert.equal(normalizeCryptoReference('usdt_trc20', `https://tronscan.org/#/transaction/${hash}`), hash)
  assert.equal(normalizeCryptoReference('eth_erc20', `https://etherscan.io/tx/0x${hash}`), '0x' + hash)
  assert.equal(normalizeCryptoReference('btc_bitcoin', hash), hash)
  assert.equal(normalizeCryptoReference('eth_bep20', `https://etherscan.io/tx/0x${hash}`), null)
  assert.equal(normalizeCryptoReference('btc_bitcoin', 'https://mempool.space.evil.test/tx/' + hash), null)
  assert.equal(normalizeCryptoReference('btc_bitcoin', 'not a reference'), null)
})
