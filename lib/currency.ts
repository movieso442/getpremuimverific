export type SupportedCurrency = 'USD' | 'XAF' | 'EUR' | 'GBP' | 'GHS' | 'KES' | 'XOF'

// Exchange rates relative to 1 USD
export const EXCHANGE_RATES: Record<SupportedCurrency, number> = {
  USD: 1,
  XAF: 600,
  XOF: 600,
  EUR: 0.92,
  GBP: 0.78,
  GHS: 15.5,
  KES: 129.0
}

/**
 * Convert an amount from one currency to another
 */
export function convertCurrency(amount: number, from: SupportedCurrency, to: SupportedCurrency): number {
  if (from === to) return amount
  const fromRate = EXCHANGE_RATES[from] || 1
  const toRate = EXCHANGE_RATES[to] || 1
  
  // Convert to USD first, then to target currency
  const inUsd = amount / fromRate
  const result = inUsd * toRate

  return Math.round(result * 100) / 100
}

/**
 * Format currency display string
 */
export function formatCurrency(amount: number, currency: SupportedCurrency): string {
  const symbols: Record<SupportedCurrency, string> = {
    USD: '$',
    XAF: 'XAF ',
    XOF: 'XOF ',
    EUR: '€',
    GBP: '£',
    GHS: 'GH₵',
    KES: 'KSh '
  }

  const symbol = symbols[currency] || `${currency} `
  if (currency === 'XAF' || currency === 'XOF') {
    return `${Math.round(amount).toLocaleString()} ${currency}`
  }
  return `${symbol}${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
