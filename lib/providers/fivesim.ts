export type FiveSimPrice = { cost?: number; count?: number; rate?: number }

export type LiveSmsQuote = {
  operator: string
  costUsd: number
  available: number
  deliveryRate?: number
}

export async function fetchFiveSimQuote(baseUrl: string, country: string, product: string): Promise<LiveSmsQuote | null> {
  const response = await fetch(`${baseUrl}/guest/prices?country=${encodeURIComponent(country)}&product=${encodeURIComponent(product)}`, {
    headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(20_000),
  })
  const payload = await response.json().catch(() => ({})) as Record<string, Record<string, Record<string, FiveSimPrice>>>
  if (!response.ok) throw new Error('5SIM could not retrieve the live price.')
  const operators = payload[country]?.[product] || {}
  const candidates = Object.entries(operators)
    .map(([operator, value]) => ({ operator, costUsd: Number(value.cost), available: Number(value.count || 0), deliveryRate: value.rate == null ? undefined : Number(value.rate) }))
    .filter((quote) => quote.available > 0 && Number.isFinite(quote.costUsd) && quote.costUsd > 0)
    .sort((a, b) => a.costUsd - b.costUsd)
  return candidates[0] || null
}
