import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { syncSmmOrder } from '@/lib/smm/sync'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const admin = createAdminClient()
    const { data: orders, error } = await admin.from('smm_orders')
      .select('id, api_order_id, quantity')
      .in('status', ['pending', 'processing', 'in_progress'])
      .not('api_order_id', 'is', null)
      .limit(100)
    if (error) throw error

    const results = await Promise.allSettled((orders || []).map((order) => syncSmmOrder(admin, order)))
    const updated = results.filter((result) => result.status === 'fulfilled' && result.value.updated).length
    const skipped = results.filter((result) => result.status === 'rejected' || (result.status === 'fulfilled' && !result.value.updated)).length
    return NextResponse.json({ checked: orders?.length || 0, updated, skipped })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'SMM status synchronization failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
