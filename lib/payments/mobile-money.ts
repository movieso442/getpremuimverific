export type MobileMoneyMethod = 'mtn_momo' | 'orange_money'
export function mobileMoneyMethod(value: unknown): value is MobileMoneyMethod {
  return value === 'mtn_momo' || value === 'orange_money'
}
export function cameroonPhone(value: unknown): string | null {
  if (typeof value !== 'string' || /[^+\d\s()-]/.test(value)) return null
  const digits = value.replace(/\D/g, '').replace(/^00237/, '').replace(/^237/, '')
  return /^6\d{8}$/.test(digits) ? digits : null
}
export function depositXaf(amount: unknown, currency: unknown = 'XAF', minimumXaf = 3000, usdXafRate = 600): number | null {
  if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0 || !['XAF', 'USD'].includes(String(currency))) return null
  if (currency === 'USD' && amount < Math.ceil(((minimumXaf - 1) / usdXafRate) * 100) / 100) return null
  const converted = currency === 'USD' ? amount * usdXafRate : amount
  if (converted > 10000000 || (currency === 'XAF' && !Number.isInteger(amount))) return null
  const xaf = currency === 'USD' ? Math.ceil(converted) : Math.round(converted)
  return xaf >= minimumXaf && xaf <= 10000000 ? xaf : null
}
