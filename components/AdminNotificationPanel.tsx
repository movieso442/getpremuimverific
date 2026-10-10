'use client'
import { useEffect, useState } from 'react'

type Status = { configured: boolean; recipient: string; sender: string; schema_ready: boolean; events: Array<{ id: string; event_key: string; attempts: number; sent_at: string | null; last_error: string | null }> }
export default function AdminNotificationPanel() {
  const [status, setStatus] = useState<Status | null>(null)
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    let disposed = false
    const refresh = async () => {
      try {
        const response = await fetch('/api/admin/notifications', { cache: 'no-store' })
        if (!response.ok) throw new Error('Notification status unavailable.')
        const result = await response.json()
        if (!disposed) setStatus(result)
      } catch { if (!disposed) setNotice('Could not load email notification status.') }
    }
    void refresh()
    const timer = window.setInterval(() => void refresh(), 30000)
    return () => { disposed = true; window.clearInterval(timer) }
  }, [])
  const retry = async () => {
    setBusy(true)
    try {
      const response = await fetch('/api/admin/notifications', { method: 'POST' })
      const result = await response.json()
      if (!response.ok) throw new Error('Could not retry notifications.')
      setNotice(result.pending_configuration ? 'Add the Resend key, verified sender and recipient to Vercel first.' : result.schema_missing ? 'Run the administrator notifications SQL upgrade first.' : `Accepted by email provider: ${result.sent}. Failed: ${result.failed || 0}. Retries respect a two-minute delay and a 23-hour safety window.`)
      const latest = await fetch('/api/admin/notifications', { cache: 'no-store' })
      if (latest.ok) setStatus(await latest.json())
    } catch { setNotice('Could not retry notifications.') }
    finally { setBusy(false) }
  }
  return <section className="rounded-2xl bg-slate-900 border border-slate-800 p-5 space-y-3">
    <h2 className="font-extrabold">Administrator email alerts</h2>
    <p className="text-sm text-slate-400">Payment submissions, wallet payment attempts, payment status changes and wallet transactions. A submitted crypto claim is not proof of receipt.</p>
    {status && <>
      <p className="text-sm">Resend: {status.configured ? 'Credentials configured (delivery not yet guaranteed)' : 'Configuration missing'} · Queue: {status.schema_ready ? 'Ready' : 'SQL upgrade required'}</p>
      <p className="text-xs text-slate-400">From: {status.sender || 'Not configured'} · To: {status.recipient || 'Not configured'}</p>
      <button disabled={busy || !status.configured || !status.schema_ready} onClick={() => void retry()} className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-bold disabled:opacity-50">{busy ? 'Sending…' : 'Send pending alerts / retry'}</button>
      <div className="space-y-2">{status.events.slice(0, 8).map(event => <div key={event.id} className="border-t border-slate-800 pt-2 text-xs"><p className="break-all">{event.event_key}</p><p className="text-slate-400">{event.sent_at ? 'Accepted by Resend' : event.last_error ? 'Needs retry or investigation' : 'Queued'} · Attempts: {event.attempts}</p>{event.last_error && <p className="text-amber-300">{event.last_error}</p>}</div>)}</div>
    </>}
    {notice && <p role="status" className="text-sm text-amber-200">{notice}</p>}
  </section>
}
