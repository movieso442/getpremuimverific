export const DISPLAY_CURRENCIES = ['XAF', 'USD', 'NGN', 'GHS', 'EUR', 'GBP', 'KES', 'XOF'] as const
export type DisplayCurrency = typeof DISPLAY_CURRENCIES[number]
export function countryCurrency(country: string | null): DisplayCurrency {
  const mapping: Record<string, DisplayCurrency> = { CM: 'XAF', NG: 'NGN', GH: 'GHS', US: 'USD', GB: 'GBP', KE: 'KES', SN: 'XOF', CI: 'XOF', FR: 'EUR', DE: 'EUR', ES: 'EUR', IT: 'EUR' }
  return mapping[(country || '').toUpperCase()] || 'USD'
}
export function isDisplayCurrency(value: string): value is DisplayCurrency {
  return DISPLAY_CURRENCIES.some(currency => currency === value)
}
