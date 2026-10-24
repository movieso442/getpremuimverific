import { requireAdmin } from '@/lib/admin/auth'

export async function GET() {
  const access = await requireAdmin()
  if ('error' in access) return Response.json({ error: access.error }, { status: access.status })
  const [customers, credits] = await Promise.all([
    access.admin.from('profiles').select('id,email,full_name,balance_xaf').neq('role', 'admin').order('created_at', { ascending: false }).limit(500),
    access.admin.from('admin_wallet_credits').select('id,profile_id,amount_xaf,reason,created_at,transaction_id').order('created_at', { ascending: false }).limit(30),
  ])
  if (customers.error) return Response.json({ error: 'Could not load customers.' }, { status: 503 })
  return Response.json({ customers: customers.data || [], credits: credits.error ? [] : (credits.data || []), schema_ready: !credits.error }, { headers: { 'Cache-Control': 'private, no-store' } })
}

export async function POST(request: Request) {
  const access = await requireAdmin()
  if ('error' in access) return Response.json({ error: access.error }, { status: access.status })
  try {
    const body = await request.json()
    if (typeof body.request_id !== 'string' || !/^[0-9a-f-]{36}$/i.test(body.request_id)
      || typeof body.profile_id !== 'string' || !/^[0-9a-f-]{36}$/i.test(body.profile_id)
      || !Number.isInteger(body.amount_xaf) || body.amount_xaf < 1 || body.amount_xaf > 1_000_000
      || typeof body.reason !== 'string' || body.reason.trim().length < 20 || body.reason.length > 2000
      || body.confirmed !== true) {
      return Response.json({ error: 'Select a customer, enter 1–1,000,000 XAF, document the verified reason, and confirm the credit.' }, { status: 400 })
    }
    const { data, error } = await access.admin.rpc('issue_admin_wallet_credit', {
      p_id: body.request_id, p_profile: body.profile_id, p_reviewer: access.profile.id,
      p_amount: body.amount_xaf, p_reason: body.reason.trim(),
    })
    if (error) return Response.json({ error: error.code === 'P0001' ? error.message : 'Wallet credit failed. No new credit was committed; check the audit record before retrying.' }, { status: 409 })
    return Response.json({ transaction_id: data }, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return Response.json({ error: 'Could not process the credit request. Check the ledger before retrying.' }, { status: 400 })
  }
}
