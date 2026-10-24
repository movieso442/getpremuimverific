/** Whole-XAF fees, rounded up so a fractional fee is never under-collected. */
import { FALLBACK_MINIMUM_TOPUP_XAF } from './minimum'

export function topupQuote(creditXaf: number, method = 'usdt_trc20', minimumXaf = FALLBACK_MINIMUM_TOPUP_XAF) {
  if (!Number.isInteger(creditXaf) || creditXaf < minimumXaf || creditXaf > 10000000) throw new Error('Invalid wallet credit')
  const feeXaf = method === 'mtn_momo' || method === 'orange_money' ? Math.ceil(creditXaf * 2 / 100)
    : method === 'payunit_card' ? Math.ceil(creditXaf * 14 / 1000)
    : Math.ceil(creditXaf * 2 / 100)
  return { creditXaf, feeXaf, totalXaf: creditXaf + feeXaf }
}
