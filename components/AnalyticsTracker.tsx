'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

function visitorSession() {
  const key = 'pv_visitor_session'
  let value = window.localStorage.getItem(key)
  if (!value) {
    value = crypto.randomUUID()
    window.localStorage.setItem(key, value)
  }
  return value
}

export function recordAnalytics(eventType: string, path: string, metadata: Record<string, unknown> = {}) {
  void fetch('/api/analytics/event', {
    method: 'POST', keepalive: true, headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event_type: eventType, path, session_id: visitorSession(), metadata }),
  })
}

export function AnalyticsTracker() {
  const pathname = usePathname()
  useEffect(() => {
    if (!pathname.startsWith('/admin')) recordAnalytics('page_view', pathname)
  }, [pathname])
  return null
}
