import { createAdminClient } from '@/lib/supabase/admin'
import { dispatchCustomerFollowups } from '@/lib/notifications/customer-followups'
export const maxDuration = 60
export async function GET(request: Request) {
  if (!process.env.CRON_SECRET || request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  try { return Response.json(await dispatchCustomerFollowups(createAdminClient()), { headers: { 'Cache-Control': 'no-store' } }) }
  catch { return Response.json({ error: 'Follow-up delivery unavailable.' }, { status: 503 }) }
}
