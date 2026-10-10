import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/auth'
import { dispatchAdminNotifications, emailConfiguration } from '@/lib/notifications/admin-email'

export async function GET() {
  const access = await requireAdmin()
  if ('error' in access) return NextResponse.json({ error: access.error }, { status: access.status })
  const { data, error } = await access.admin.from('admin_notification_outbox')
    .select('id, event_key, attempts, sent_at, last_error, created_at').order('created_at', { ascending: false }).limit(50)
  return NextResponse.json({ ...emailConfiguration(), schema_ready: !error, events: data || [] }, { headers: { 'Cache-Control': 'private, no-store' } })
}

export async function POST() {
  const access = await requireAdmin()
  if ('error' in access) return NextResponse.json({ error: access.error }, { status: access.status })
  return NextResponse.json(await dispatchAdminNotifications(access.admin, 3))
}
