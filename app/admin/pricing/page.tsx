'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Loader2, Save, Search } from 'lucide-react'

type Service = { service_id: number; name: string; category: string; rate_usd: number; min: number; max: number; override: { retail_rate_xaf: number; is_active: boolean } | null }

export default function AdminPricingPage() {
  const [services, setServices] = useState<Service[]>([])
  const [query, setQuery] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<number | null>(null)
  const [drafts, setDrafts] = useState<Record<number, string>>({})

  const load = async () => {
    setLoading(true)
    const response = await fetch('/api/admin/catalog/pricing', { cache: 'no-store' })
    const result = await response.json()
    if (response.status === 401 || response.status === 403) { window.location.replace('/admin/login'); return }
    if (!response.ok) setError(result.error || 'Could not load prices.')
    else {
      setServices(result.services)
      setDrafts(Object.fromEntries(result.services.filter((service: Service) => service.override).map((service: Service) => [service.service_id, String(service.override?.retail_rate_xaf || '')])))
    }
    setLoading(false)
  }
  useEffect(() => { void load() }, [])
  const visible = useMemo(() => services.filter((service) => `${service.service_id} ${service.name} ${service.category}`.toLowerCase().includes(query.toLowerCase())), [services, query])
  const save = async (service: Service) => {
    const raw = drafts[service.service_id]?.trim()
    setSaving(service.service_id)
    const response = await fetch('/api/admin/catalog/pricing', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ service_id: service.service_id, retail_rate_xaf: raw ? Number(raw) : null }) })
    const result = await response.json()
    if (!response.ok) setError(result.error || 'Could not save price.')
    else await load()
    setSaving(null)
  }
  if (loading) return <main className="min-h-screen grid place-items-center bg-slate-950 text-white"><Loader2 className="animate-spin" /></main>
  return <main className="min-h-screen bg-slate-950 p-4 md:p-8 text-slate-100"><div className="mx-auto max-w-6xl"><Link href="/admin" className="inline-flex items-center gap-2 text-sm text-slate-300 hover:text-white"><ArrowLeft className="w-4 h-4" />Back to administrator portal</Link><h1 className="mt-5 text-3xl font-black">Individual service prices</h1><p className="mt-2 text-sm text-slate-400">Set a retail XAF price per 1,000 units. Leave a field empty to use the global multiplier. Checkout always validates the supplier service and limits again before charging.</p>{error && <p className="mt-4 rounded-lg bg-red-500/15 p-3 text-sm text-red-100">{error}</p>}<div className="mt-6 flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 p-3"><Search className="w-4 h-4 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find a provider service by name, category, or ID" className="w-full bg-transparent text-sm outline-none" /></div><div className="mt-4 overflow-x-auto rounded-2xl border border-slate-800"><table className="w-full min-w-220 text-sm"><thead className="bg-slate-900 text-left text-xs uppercase text-slate-400"><tr><th className="p-3">Service</th><th className="p-3">Supplier rate / 1k</th><th className="p-3">Limits</th><th className="p-3">Your price / 1k</th><th className="p-3" /></tr></thead><tbody>{visible.slice(0, 500).map((service) => <tr key={service.service_id} className="border-t border-slate-800"><td className="p-3"><p className="font-bold">{service.name}</p><p className="text-xs text-slate-500">#{service.service_id} · {service.category}</p></td><td className="p-3">${Number(service.rate_usd).toFixed(4)}</td><td className="p-3">{service.min.toLocaleString()}–{service.max.toLocaleString()}</td><td className="p-3"><input type="number" min="1" step="5" value={drafts[service.service_id] || ''} onChange={(event) => setDrafts({ ...drafts, [service.service_id]: event.target.value })} placeholder="Global rule" className="w-32 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2" /></td><td className="p-3"><button onClick={() => void save(service)} disabled={saving === service.service_id} className="inline-flex items-center gap-2 rounded-lg bg-orange-600 px-3 py-2 text-xs font-bold disabled:opacity-60"><Save className="w-3.5 h-3.5" />{saving === service.service_id ? 'Saving' : 'Save'}</button></td></tr>)}</tbody></table></div>{visible.length > 500 && <p className="mt-3 text-xs text-slate-400">Refine your search to edit the remaining {visible.length - 500} services.</p>}</div></main>
}
