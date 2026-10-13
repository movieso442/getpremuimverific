import { countryCurrency, isDisplayCurrency } from '@/lib/local-currency'

// Informational only. Never use this reference rate for wallet settlement.
export async function GET(request: Request) {
  const selected = new URL(request.url).searchParams.get('currency') || ''
  const currency = isDisplayCurrency(selected) ? selected : countryCurrency(process.env.VERCEL === '1' ? request.headers.get('x-vercel-ip-country') : null)
  const headers = { 'Cache-Control': 'private, no-store' }
  if (currency === 'XAF') return Response.json({ currency, rate: 1, date: null }, { headers })
  try {
    const response = await fetch(`https://api.frankfurter.dev/v2/rate/XAF/${currency}`, { next: { revalidate: 3600 }, signal: AbortSignal.timeout(4000) })
    if (!response.ok) throw new Error('Rate unavailable')
    const result = await response.json()
    if (!Number.isFinite(result.rate) || result.rate <= 0 || typeof result.date !== 'string') throw new Error('Invalid rate')
    const date = Date.parse(result.date)
    if (!Number.isFinite(date) || Date.now() - date > 7 * 86400000) throw new Error('Rate is out of date')
    return Response.json({ currency, rate: result.rate, date: result.date }, { headers })
  } catch {
    return Response.json({ currency: 'XAF', rate: 1, date: null, notice: 'Local estimate unavailable. Showing wallet currency.' }, { headers })
  }
}
