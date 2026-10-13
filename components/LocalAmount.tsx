'use client'
import { useEffect, useState } from 'react'
import { useAppState } from '@/lib/store'
import { isDisplayCurrency } from '@/lib/local-currency'
export default function LocalAmount({ amountXaf }: { amountXaf: number }) {
  const { profile } = useAppState()
  const [quote, setQuote] = useState<{ currency: string; rate: number; date: string | null } | null>(null)
  const selected = isDisplayCurrency(profile.currency) ? profile.currency : ''
  useEffect(() => {
    const controller = new AbortController()
    fetch(`/api/display-currency${selected ? `?currency=${selected}` : ''}`, { signal: controller.signal }).then(response => response.json()).then(result => { if (typeof result.currency === 'string' && Number.isFinite(result.rate) && result.rate > 0) setQuote(result) }).catch(() => undefined)
    return () => controller.abort()
  }, [selected])
  if (!quote || quote.currency === 'XAF') return <span>{amountXaf.toLocaleString()} XAF</span>
  return <span title={`Indicative conversion · ${quote.date}. Wallet settlement remains XAF.`}>≈ {new Intl.NumberFormat(undefined, { style: 'currency', currency: quote.currency }).format(amountXaf * quote.rate)}</span>
}
