'use client'

import { useEffect, useState } from 'react'

type PublicStats = {
  visitors_30d: number | null
  customers: number
  completed_orders: number
  period_days: number
}

export function PublicProofStats() {
  const [stats, setStats] = useState<PublicStats | null>(null)

  useEffect(() => {
    let active = true
    fetch('/api/public/stats')
      .then(response => response.ok ? response.json() as Promise<PublicStats> : null)
      .then(result => { if (active && result) setStats(result) })
      .catch(() => undefined)
    return () => { active = false }
  }, [])

  if (!stats) return null

  const cards = [
    ...(stats.visitors_30d === null ? [] : [{ value: stats.visitors_30d, label: 'Tracked visitors · last 30 days' }]),
    { value: stats.customers, label: 'Customer accounts' },
    { value: stats.completed_orders, label: 'Completed service orders' },
  ]

  return (
    <section aria-label="Premium Verific platform activity" className="mx-auto max-w-6xl px-6 py-8">
      <div className="grid grid-cols-1 gap-3 rounded-2xl border border-orange-100 bg-white p-4 shadow-sm sm:grid-cols-3">
        {cards.map(card => (
          <div key={card.label} className="px-4 py-3 text-center">
            <p className="text-2xl font-black text-gray-900">{card.value.toLocaleString()}</p>
            <p className="mt-1 text-sm text-gray-600">{card.label}</p>
          </div>
        ))}
      </div>
      {stats.visitors_30d !== null && <p className="mt-2 text-center text-xs text-gray-500">Visitor totals are based on recorded browser sessions and are not independently verified.</p>}
    </section>
  )
}
