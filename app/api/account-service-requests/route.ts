import { customerUser } from '@/lib/supabase/customer'
import { createAdminClient } from '@/lib/supabase/admin'

async function access(request: Request) {
  const user = await customerUser(request)
  if (!user?.email_confirmed_at || user.is_anonymous) return null
  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('id').eq('user_id', user.id).single()
  return profile ? { admin, profile } : null
}

export async function GET(request: Request) {
  const session = await access(request)
  if (!session) return Response.json({ error: 'Sign in to view your requests.' }, { status: 401 })
  const { data, error } = await session.admin.from('account_service_requests')
    .select('id,platform,requirements,quantity,details,state,quote_xaf,created_at,reviewed_at')
    .eq('profile_id', session.profile.id).order('created_at', { ascending: false }).limit(50)
  if (error) return Response.json({ error: 'Account requests are temporarily unavailable.' }, { status: 503 })
  return Response.json({ requests: data }, { headers: { 'Cache-Control': 'private, no-store' } })
}

export async function POST(request: Request) {
  const origin = request.headers.get('origin')
  if (origin && origin !== new URL(request.url).origin) return Response.json({ error: 'Invalid request origin.' }, { status: 403 })
  const session = await access(request)
  if (!session) return Response.json({ error: 'Sign in with a verified account to request this service.' }, { status: 401 })
  try {
    const body = await request.json()
    if (typeof body.platform !== 'string' || typeof body.requirements !== 'string' || typeof body.details !== 'string'
      || !Number.isInteger(body.quantity) || body.platform.length > 30 || body.requirements.length > 300 || body.details.length > 1000)
      return Response.json({ error: 'Check the request details and try again.' }, { status: 400 })
    const { data, error } = await session.admin.rpc('submit_account_service_request', {
      p_profile: session.profile.id, p_platform: body.platform, p_requirements: body.requirements,
      p_quantity: body.quantity, p_details: body.details,
    })
    if (error) return Response.json({ error: error.code === 'P0001' ? error.message : 'Could not save this request.' }, { status: error.code === 'P0001' ? 409 : 503 })
    return Response.json({ id: data, state: 'pending' }, { status: 201, headers: { 'Cache-Control': 'private, no-store' } })
  } catch { return Response.json({ error: 'Invalid request.' }, { status: 400 }) }
}
