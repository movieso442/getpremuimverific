export type FiveSimPrice = { cost?: number; count?: number; rate?: number }

export type LiveSmsQuote = {
  operator: string
  costUsd: number
  available: number
  deliveryRate?: number
}

export type LiveSmsCountry = { slug: string; label: string }
export type LiveSmsProduct = { product: string; available: number; costUsd: number; category: string }

function labelFromSlug(value: string) {
  return value.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/([a-z])(\d)/g, '$1 $2').replace(/(^|\s)\S/g, (part) => part.toUpperCase())
}

/** Public 5SIM catalogue: no provider key is exposed to the caller. */
export async function fetchFiveSimCountries(baseUrl: string): Promise<LiveSmsCountry[]> {
  const response = await fetch(`${baseUrl}/guest/countries`, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(20_000) })
  const payload = await response.json().catch(() => ({})) as Record<string, unknown>
  if (!response.ok) throw new Error('5SIM could not retrieve the country catalogue.')
  return Object.keys(payload).map((slug) => ({ slug, label: labelFromSlug(slug) })).sort((a, b) => a.label.localeCompare(b.label))
}

export async function fetchFiveSimProducts(baseUrl: string, country: string): Promise<LiveSmsProduct[]> {
  const response = await fetch(`${baseUrl}/guest/products/${encodeURIComponent(country)}/any`, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(20_000) })
  const payload = await response.json().catch(() => ({})) as Record<string, { Qty?: number; Price?: number; Category?: string }>
  if (!response.ok) throw new Error('5SIM could not retrieve live services for this country.')
  return Object.entries(payload)
    .map(([product, value]) => ({ product, available: Number(value.Qty || 0), costUsd: Number(value.Price), category: String(value.Category || 'activation') }))
    .filter((item) => item.available > 0 && Number.isFinite(item.costUsd) && item.costUsd > 0)
    .sort((a, b) => b.available - a.available || a.costUsd - b.costUsd)
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
