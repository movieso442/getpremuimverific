'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import LocalAmount from '@/components/LocalAmount'
import {smmPlatform,sortSmmPlatforms} from '@/lib/smm/catalogue'
import {useTranslations} from 'next-intl'
type Service = { service_id?: number; id: number; name: string; category: string; retail_rate_xaf: number; min: number; max: number }
export default function OrderCalculator() {
  const t = useTranslations('Calculator')
  const c = useTranslations('Common')
  const [services, setServices] = useState<Service[]>([])
  const [category, setCategory] = useState('')
  const [serviceId, setServiceId] = useState('')
  const [quantity, setQuantity] = useState(1000)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/v1/smm/services', { signal: controller.signal }).then(async response => {
      const data = await response.json()
      if (!response.ok || !Array.isArray(data.services)) throw new Error(t('error'))
      setServices(data.services)
    }).catch(reason => { if (!controller.signal.aborted) setError(reason.message) }).finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [t])
  const categories = sortSmmPlatforms(services.map(smmPlatform))
  const options = services.filter(service => smmPlatform(service) === category)
  const service = options.find(service => String(service.service_id || service.id) === serviceId)
  const valid = service && Number.isInteger(quantity) && quantity >= service.min && quantity <= service.max
  return <div className="rounded-3xl border bg-white p-6 sm:p-8 space-y-5">
    <div className="flex flex-wrap gap-3"><span className="rounded-xl bg-orange-50 px-4 py-3 font-bold text-orange-800">{c('socialGrowth')}</span><Link href="/sms-verification" className="rounded-xl border px-4 py-3 font-bold">{c('virtualNumbers')} →</Link></div>
    {loading && <p role="status">{t('loading')}</p>}{error && <p role="alert" className="text-red-700">{error}</p>}
    <label className="block font-semibold">{t('platform')}<select aria-label={t('platform')} value={category} onChange={event => { setCategory(event.target.value); setServiceId('') }} className="mt-2 w-full min-w-0 rounded-xl border p-3"><option value="">{t('choosePlatform')}</option>{categories.map(value => <option key={value}>{value}</option>)}</select></label>
    <label className="block font-semibold">{t('service')}<select aria-label={t('service')} value={serviceId} disabled={!category} onChange={event => { setServiceId(event.target.value); const selected = options.find(item => String(item.service_id || item.id) === event.target.value); if (selected) setQuantity(Math.max(selected.min, Math.min(1000, selected.max))) }} className="mt-2 w-full min-w-0 rounded-xl border p-3"><option value="">{t('chooseService')}</option>{options.map(item => <option key={item.service_id || item.id} value={item.service_id || item.id}>{item.name}</option>)}</select></label>
    <label className="block font-semibold">{t('quantity')}<input type="number" step={1} min={service?.min || 1} max={service?.max} value={quantity} onChange={event => setQuantity(Number(event.target.value))} className="mt-2 w-full rounded-xl border p-3" /></label>
    {service && <p>{t('units', {min: service.min.toLocaleString(), max: service.max.toLocaleString(), rate: Number(service.retail_rate_xaf).toLocaleString()})}</p>}
    <p className="text-2xl font-extrabold text-orange-700">{valid ? `${Math.ceil(Number(service.retail_rate_xaf) * quantity / 1000).toLocaleString()} XAF` : t('invalid')}</p>
    {valid && <p className="text-lg"><LocalAmount amountXaf={Math.ceil(Number(service.retail_rate_xaf) * quantity / 1000)} /></p>}
    <p className="text-gray-600">{t('estimate')}</p>
    <Link href={service ? `/dashboard?service=${service.service_id || service.id}&quantity=${quantity}` : '/dashboard'} className="inline-flex rounded-xl bg-orange-600 px-5 py-3 font-bold text-white">{t('order')}</Link>
  </div>
}
