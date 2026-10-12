export type MobileMoneyMethod = 'mtn_momo' | 'orange_money'
export function mobileMoneyMethod(value: unknown): value is MobileMoneyMethod {
  return value === 'mtn_momo' || value === 'orange_money'
}
export function cameroonPhone(value: unknown): string | null {
  if (typeof value !== 'string' || /[^+\d\s()-]/.test(value)) return null
  const digits = value.replace(/\D/g, '').replace(/^00237/, '').replace(/^237/, '')
  return /^6\d{8}$/.test(digits) ? digits : null
}
export function depositXaf(amount: unknown, currency: unknown = 'XAF'): number | null {
  if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0 || !['XAF', 'USD'].includes(String(currency))) return null
  const converted = currency === 'USD' ? amount * 600 : amount
  if (converted < 3000 || converted > 10000000 || (currency === 'XAF' && !Number.isInteger(amount))) return null
  const xaf = Math.round(converted)
  return xaf >= 3000 && xaf <= 10000000 ? xaf : null
}
