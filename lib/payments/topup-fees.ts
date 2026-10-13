/** Whole-XAF fees, rounded up so a fractional fee is never under-collected. */
export function topupQuote(creditXaf: number) {
  if (!Number.isInteger(creditXaf) || creditXaf < 3000 || creditXaf > 10000000) throw new Error('Invalid wallet credit')
  const feeXaf = Math.ceil(creditXaf * 2 / 100)
  return { creditXaf, feeXaf, totalXaf: creditXaf + feeXaf }
}
