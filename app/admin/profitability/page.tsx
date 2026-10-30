'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Loader2 } from 'lucide-react'

type Service = { service_id: number; name: string; category: string; provider_cost_xaf_per_1k: number; retail_xaf_per_1k: number; gross_profit_xaf_per_1k: number; gross_markup_percent: number | null }
type SmsService = { service: string; country: string; order_count: number; sales_xaf: number; known_cost_xaf: number; known_cost_orders: number; estimated_gross_profit_xaf: number | null }
type Report = { fx_xaf_per_usd_assumption: number; minimum_markup_percent: number; smm: Service[]; sms: SmsService[] }
const xaf = (value: number | null | undefined) => value == null ? 'Unknown' : `${Math.ceil(value).toLocaleString()} XAF`

export default function AdminProfitabilityPage() {
  const [report, setReport] = useState<Report | null>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    void fetch('/api/admin/profitability', { cache: 'no-store' }).then(async (response) => {
      const result = await response.json()
      if (response.status === 401 || response.status === 403) { window.location.replace('/admin/login'); return }
      if (!response.ok) throw new Error(result.error || 'Could not load profitability report.')
      setReport(result)
    }).catch((reason) => setError(reason instanceof Error ? reason.message : 'Could not load profitability report.'))
  }, [])
  if (error) return <main className="min-h-screen bg-slate-950 p-8 text-white"><p role="alert">{error}</p></main>
  if (!report) return <main className="min-h-screen grid place-items-center bg-slate-950 text-white"><Loader2 className="animate-spin" /></main>
  return <main className="min-h-screen bg-slate-950 p-4 md:p-8 text-slate-100"><div className="mx-auto max-w-7xl"><Link href="/admin" className="inline-flex items-center gap-2 text-sm text-slate-300"><ArrowLeft className="h-4 w-4" />Administrator portal</Link><h1 className="mt-5 text-3xl font-black">Service profitability</h1><p className="mt-2 text-sm text-slate-300">New SMS and SMM prices now have a minimum 25% gross markup over quoted provider cost: 2,000 XAF cost means at least 2,500 XAF sale. This is gross profit, before payment fees, refunds, and overhead.</p><div className="mt-5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">SMM estimates use the current JAP catalogue rate and {report.fx_xaf_per_usd_assumption} XAF/USD. SMS order estimates use the provider cost recorded at purchase, converted with the same assumption. Neither is audited net profit; historic or unrecorded supplier costs are shown as unknown.</div><section className="mt-6 overflow-x-auto rounded-2xl border border-slate-800"><h2 className="p-4 font-bold">SMM catalogue · estimated gross profit per 1,000 units</h2><table className="w-full min-w-220 text-sm"><thead className="bg-slate-900 text-left text-xs uppercase text-slate-400"><tr><th className="p-3">Service</th><th className="p-3">Provider cost / 1k</th><th className="p-3">Your price / 1k</th><th className="p-3">Gross profit / 1k</th><th className="p-3">Markup</th></tr></thead><tbody>{report.smm.slice(0, 500).map((service) => <tr key={service.service_id} className="border-t border-slate-800"><td className="p-3"><b>{service.name}</b><p className="text-xs text-slate-500">#{service.service_id} · {service.category}</p></td><td className="p-3">{xaf(service.provider_cost_xaf_per_1k)}</td><td className="p-3">{xaf(service.retail_xaf_per_1k)}</td><td className="p-3 font-bold text-emerald-300">{xaf(service.gross_profit_xaf_per_1k)}</td><td className="p-3">{service.gross_markup_percent?.toFixed(1)}%</td></tr>)}</tbody></table></section><section className="mt-6 overflow-x-auto rounded-2xl border border-slate-800"><h2 className="p-4 font-bold">SMS services · grouped from the latest 1,000 orders</h2><table className="w-full min-w-220 text-sm"><thead className="bg-slate-900 text-left text-xs uppercase text-slate-400"><tr><th className="p-3">Service / country</th><th className="p-3">Orders</th><th className="p-3">Sales</th><th className="p-3">Recorded provider costs</th><th className="p-3">Estimated gross profit</th><th className="p-3">Cost coverage</th></tr></thead><tbody>{report.sms.map((service) => <tr key={`${service.service}-${service.country}`} className="border-t border-slate-800"><td className="p-3">{service.service} · {service.country}</td><td className="p-3">{service.order_count}</td><td className="p-3">{xaf(service.sales_xaf)}</td><td className="p-3">{service.known_cost_orders === service.order_count ? xaf(service.known_cost_xaf) : `${xaf(service.known_cost_xaf)} known`}</td><td className="p-3 font-bold">{xaf(service.estimated_gross_profit_xaf)}</td><td className="p-3 text-xs text-slate-400">{service.known_cost_orders}/{service.order_count} orders have cost data</td></tr>)}</tbody></table>{report.sms.length === 0 && <p className="p-4 text-sm text-slate-400">No SMS orders in the available report window.</p>}</section></div></main>
}
