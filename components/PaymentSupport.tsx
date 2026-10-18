"use client"
import {useTranslations} from 'next-intl'
export default function PaymentSupport() {
  const t = useTranslations('PaymentSupport')
  return <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-gray-900">
    <h2 className="font-bold">{t('title')}</h2>
    <p className="mt-2 text-sm">{t('body')}</p>
    <a href="https://wa.me/237640796062?text=Hello%20Premium%20Verify%2C%20I%20need%20help%20with%20a%20payment%20method."
      target="_blank" rel="noopener noreferrer" className="mt-3 inline-block rounded-xl bg-emerald-700 px-4 py-3 text-sm font-bold text-white">{t('action')}</a>
    <p className="mt-2 text-xs">{t('safety')}</p>
  </section>
}
