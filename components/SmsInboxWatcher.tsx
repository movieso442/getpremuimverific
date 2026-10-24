'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

type Order = { provider_order_id: string | null; status: string; sms_code: string | null }
export default function SmsInboxWatcher() {
  const pathname = usePathname()
  const [newCode, setNewCode] = useState(false)
  useEffect(() => {
    if (pathname === '/sms-verification') return
    let disposed = false
    let checking = false
    const poll = async () => {
      if (checking || document.visibilityState !== 'visible') return
      checking = true
      try {
        const response = await fetch('/api/v1/sms/order', { cache: 'no-store' })
        if (!response.ok) return
        const data = await response.json() as { orders?: Order[] }
        const pending = (data.orders || []).filter(order => order.status === 'waiting_sms' && order.provider_order_id).slice(0, 5)
        if (!pending.length) return
        const checks = await Promise.allSettled(pending.map(order => fetch('/api/v1/sms/order', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'getStatus', id: order.provider_order_id }) }).then(response => response.ok ? response.json() : null)))
        if (!disposed && checks.some(check => check.status === 'fulfilled' && check.value?.code)) setNewCode(true)
      } catch { /* Retry on the next interval without interrupting the portal. */ }
      finally { checking = false }
    }
    void poll()
    const timer = window.setInterval(() => void poll(), 15_000)
    return () => { disposed = true; window.clearInterval(timer) }
  }, [pathname])
  if (!newCode) return null
  return <div role="status" className="fixed bottom-5 left-5 z-50 max-w-sm rounded-2xl border border-emerald-300 bg-emerald-950 p-4 text-white shadow-2xl"><p className="font-bold">Your SMS code has arrived</p><p className="mt-1 text-sm text-emerald-100">Open your private SMS inbox to view it.</p><div className="mt-3 flex gap-3 text-sm"><Link href="/sms-verification" className="rounded-lg bg-emerald-500 px-3 py-2 font-bold text-emerald-950">View code</Link><button onClick={() => setNewCode(false)} className="px-2">Dismiss</button></div></div>
}
