'use client'

import {useLocale} from 'next-intl'
import {useRouter} from 'next/navigation'
import {useTransition} from 'react'

export default function LanguageSwitcher() {
  const locale = useLocale()
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  return <label className="inline-flex items-center gap-1 text-xs font-bold text-slate-700">
    <span className="sr-only">Language / Langue</span>
    <select aria-label="Language / Langue" value={locale} disabled={pending} onChange={event => {
      const next = event.target.value === 'fr' ? 'fr' : 'en'
      document.cookie = `pv_locale=${next}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`
      document.documentElement.lang = next
      startTransition(() => router.refresh())
    }} className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs font-bold text-slate-700">
      <option value="en">EN</option><option value="fr">FR</option>
    </select>
  </label>
}
