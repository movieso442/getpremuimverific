import { createAdminClient } from '@/lib/supabase/admin'
import { dispatchCustomerFollowups } from '@/lib/notifications/customer-followups'
import { refreshMinimumTopup } from '@/lib/payments/refresh-minimum'
export const maxDuration = 60
export async function GET(request: Request) {
  if (!process.env.CRON_SECRET || request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const admin = createAdminClient()
    let reference: unknown
    try { reference = await refreshMinimumTopup(admin) }
    catch { reference = { updated: false }; console.error('[Daily top-up reference refresh failed]') }
    return Response.json({ reference, followups: await dispatchCustomerFollowups(admin) }, { headers: { 'Cache-Control': 'no-store' } })
  }
  catch { return Response.json({ error: 'Follow-up delivery unavailable.' }, { status: 503 }) }
}
