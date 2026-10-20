import { test } from 'node:test'
import assert from 'node:assert/strict'
import { minimumXafFromUsdPerEur, parseEcbUsdRate } from './minimum'
import { depositXaf } from './mobile-money'
import { topupQuote } from './topup-fees'

test('daily ECB USD/EUR observation sets a whole-XAF USD 3 threshold', () => {
  const csv = 'TIME_PERIOD,OBS_VALUE\n2026-10-16,1.1253\n'
  const result = parseEcbUsdRate(csv, new Date('2026-10-19T00:00:00Z'))
  assert.equal(result.minimumTopupXaf, Math.ceil(3 * 655.957 / 1.1253))
  assert.equal(result.minimumTopupXaf, minimumXafFromUsdPerEur(1.1253))
  assert.equal(depositXaf(result.minimumTopupXaf - 1, 'XAF', result.minimumTopupXaf), null)
  assert.equal(depositXaf(result.minimumTopupXaf, 'XAF', result.minimumTopupXaf), result.minimumTopupXaf)
  assert.equal(depositXaf(3, 'USD', result.minimumTopupXaf, 655.957 / 1.1253), result.minimumTopupXaf)
  assert.equal(depositXaf(2.99, 'USD', result.minimumTopupXaf, 655.957 / 1.1253), null)
  assert.deepEqual(topupQuote(result.minimumTopupXaf, 'mtn_momo', result.minimumTopupXaf), {
    creditXaf: result.minimumTopupXaf, feeXaf: 0, totalXaf: result.minimumTopupXaf,
  })
  assert.equal(topupQuote(result.minimumTopupXaf, 'usdt_trc20', result.minimumTopupXaf).feeXaf,
    Math.ceil(result.minimumTopupXaf * 0.02))
})

test('bad and stale reference observations are rejected', () => {
  for (const csv of ['', 'TIME_PERIOD,OBS_VALUE\n2026-10-01,1.1253', 'TIME_PERIOD,OBS_VALUE\n2026-10-16,0'])
    assert.throws(() => parseEcbUsdRate(csv, new Date('2026-10-19T00:00:00Z')))
})
