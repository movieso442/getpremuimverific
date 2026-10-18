'use client'
import { useEffect, useState } from 'react'
import {useTranslations} from 'next-intl'

export default function UsdtEstimate({ creditXaf, feeXaf }: { creditXaf: number; feeXaf: number }) {
  const t = useTranslations('Usdt')
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
  if (!reference) return <p className="text-sm text-gray-600">{unavailable ? t('unavailable') : t('loading')}</p>
  const usdt = (amount: number) => (amount * reference.rate).toFixed(6)
  return <section aria-label={t('equivalent')} className="rounded-xl border border-orange-200 bg-orange-50 p-4 text-base space-y-2">
    <h3 className="font-bold">{t('equivalent')}</h3>
    <p>{t('wallet')}: <strong>≈ {usdt(creditXaf)} USDT</strong></p>
    <p>{t('fee')}: <strong>≈ {usdt(feeXaf)} USDT</strong></p>
    <p>{t('total')}: <strong>≈ {usdt(creditXaf + feeXaf)} USDT</strong></p>
    <p className="text-sm text-gray-600">{t('warning', {date: reference.date})}</p>
  </section>
}
