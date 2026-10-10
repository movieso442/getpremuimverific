import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { syncSmsOrder } from '@/lib/sms/sync'
import { scheduleAdminNotifications } from '@/lib/notifications/admin-email'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const admin = createAdminClient()
    scheduleAdminNotifications(admin)
    const { data: orders, error } = await admin.from('sms_orders')
      .select('id, provider_order_id, phone_number, service_name, profile_id')
      .eq('status', 'waiting_sms').not('provider_order_id', 'is', null).limit(100)
    if (error) throw error
    const results = await Promise.allSettled((orders || []).map((order) => syncSmsOrder(admin, order)))
    return NextResponse.json({
      checked: orders?.length || 0,
      received: results.filter((result) => result.status === 'fulfilled' && result.value.status === 'received').length,
      notified: results.filter((result) => result.status === 'fulfilled' && result.value.notified).length,
      failed: results.filter((result) => result.status === 'rejected').length,
    })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'SMS status synchronization failed' }, { status: 500 })
  }
}
