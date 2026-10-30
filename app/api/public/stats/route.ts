import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const revalidate = 3600

export async function GET() {
  try {
    const admin = createAdminClient()
    const [customers, smsOrders, smmOrders, accountOrders] = await Promise.all([
      admin.from('profiles').select('id', { count: 'exact', head: true }).neq('role', 'admin'),
      admin.from('sms_orders').select('id', { count: 'exact', head: true }).eq('status', 'received'),
      admin.from('smm_orders').select('id', { count: 'exact', head: true }).eq('status', 'completed'),
      admin.from('account_orders').select('id', { count: 'exact', head: true }).eq('status', 'completed'),
    ])

    const failed = [customers, smsOrders, smmOrders, accountOrders].find(result => result.error)
    if (failed?.error) throw failed.error

    // Visitor telemetry is best-effort: if its migration is not installed,
    // still show verified customer/order aggregates without inventing a count.
    let visitors30d: number | null = null
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const visitorIds = new Set<string>()
    for (let offset = 0; offset < 50000; offset += 1000) {
      const { data, error } = await admin.from('audit_events')
        .select('session_id')
        .eq('event_type', 'page_view')
        .gte('created_at', since)
        .not('session_id', 'is', null)
        .range(offset, offset + 999)
      if (error) break
      for (const event of data ?? []) if (event.session_id) visitorIds.add(event.session_id)
      if (!data || data.length < 1000) {
        visitors30d = visitorIds.size
        break
      }
    }

    return NextResponse.json({
      visitors_30d: visitors30d,
      customers: customers.count ?? 0,
      completed_orders: (smsOrders.count ?? 0) + (smmOrders.count ?? 0) + (accountOrders.count ?? 0),
      period_days: 30,
    })
  } catch {
    return NextResponse.json({ error: 'Public statistics are temporarily unavailable.' }, { status: 503 })
  }
}
