'use client'
import { useEffect, useState } from 'react'

export default function UsdtEstimate({ creditXaf, feeXaf }: { creditXaf: number; feeXaf: number }) {
  const [reference, setReference] = useState<{ rate: number; date: string } | null>(null)
  const [unavailable, setUnavailable] = useState(false)
  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/display-currency?currency=USD', { signal: controller.signal }).then(async response => {
      const result = await response.json()
      if (!response.ok || result.currency !== 'USD' || !Number.isFinite(result.rate) || result.rate <= 0 || typeof result.date !== 'string') throw new Error('No USD reference')
      setReference({ rate: result.rate, date: result.date })
    }).catch(() => { if (!controller.signal.aborted) setUnavailable(true) })
    return () => controller.abort()
  }, [])
  if (!reference) return <p className="text-sm text-gray-600">{unavailable ? 'USDT estimate unavailable. Confirm the exact amount with support before transferring.' : 'Loading USDT equivalent…'}</p>
  const usdt = (amount: number) => (amount * reference.rate).toFixed(6)
  return <section aria-label="USDT equivalent" className="rounded-xl border border-orange-200 bg-orange-50 p-4 text-base space-y-2">
    <h3 className="font-bold">Estimated USDT equivalent</h3>
    <p>Wallet credit: <strong>≈ {usdt(creditXaf)} USDT</strong></p>
    <p>2% crypto fee: <strong>≈ {usdt(feeXaf)} USDT</strong></p>
    <p>Total transfer value: <strong>≈ {usdt(creditXaf + feeXaf)} USDT</strong></p>
    <p className="text-sm text-gray-600">USD reference rate dated {reference.date}, assuming approximately 1 USD per USDT. This is an estimate, not a locked transfer quote. Confirm the final USDT amount before paying. Network fees are separate.</p>
  </section>
}
