import { customerUser } from '@/lib/supabase/customer'
import { createAdminClient } from '@/lib/supabase/admin'
import { isCryptoMethod } from '@/lib/payments/manual-crypto'
import { scheduleCustomerFollowups } from '@/lib/notifications/customer-followups'

export async function POST(request: Request) {
  try {
    const user = await customerUser(request)
    if (!user?.email_confirmed_at || user.is_anonymous) return Response.json({ error: 'Sign in is required.' }, { status: 401 })
    const body = await request.json()
    if (typeof body.id !== 'string' || !/^[a-f0-9-]{36}$/i.test(body.id) || !['started','cancelled'].includes(body.state) || typeof body.method !== 'string' || !(isCryptoMethod(body.method) || ['mtn_momo','orange_money'].includes(body.method))) return Response.json({ error: 'Invalid checkout event.' }, { status: 400 })
    const admin = createAdminClient()
    const { data: profile } = await admin.from('profiles').select('id').eq('user_id', user.id).single()
    if (!profile) return Response.json({ error: 'Profile unavailable.' }, { status: 404 })
    const { error } = await admin.rpc('track_customer_checkout', { p_profile: profile.id, p_id: body.id, p_state: body.state, p_method: body.method })
    if (error) return Response.json({ error: 'Checkout tracking unavailable.' }, { status: 503 })
    scheduleCustomerFollowups(admin)
    return Response.json({ success: true }, { headers: { 'Cache-Control': 'no-store' } })
  } catch { return Response.json({ error: 'Checkout tracking unavailable.' }, { status: 400 }) }
}
