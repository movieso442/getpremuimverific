import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/auth'
import { scheduleAdminNotifications } from '@/lib/notifications/admin-email'

export async function GET() {
  const access = await requireAdmin()
  if ('error' in access) return NextResponse.json({ error: access.error }, { status: access.status })
  const { data, error } = await access.admin.from('manual_payment_claims').select('*')
    .order('created_at', { ascending: false }).limit(200)
  if (error) return NextResponse.json({ error: 'Run the manual crypto SQL upgrade.' }, { status: 503 })
  return NextResponse.json({ claims: data }, { headers: { 'Cache-Control': 'private, no-store' } })
}

export async function PATCH(request: Request) {
  const access = await requireAdmin()
  if ('error' in access) return NextResponse.json({ error: access.error }, { status: access.status })
  try {
    const { claim_id, action, approved_amount_xaf } = await request.json()
    if (typeof claim_id !== 'string' || !['confirm', 'reject'].includes(action))
      return NextResponse.json({ error: 'A claim and review action are required.' }, { status: 400 })
    if (approved_amount_xaf != null && (!Number.isInteger(approved_amount_xaf) || approved_amount_xaf <= 0 || approved_amount_xaf > 10000000))
      return NextResponse.json({ error: 'Enter a verified whole positive XAF credit up to 10,000,000.' }, { status: 400 })
    const { data, error } = await access.admin.rpc('review_manual_payment', {
      p_claim_id: claim_id, p_reviewer: access.profile.id, p_action: action, p_amount_xaf: approved_amount_xaf ?? null,
    })
    if (error) return NextResponse.json({ error: 'Review failed: ensure the SQL upgrade is installed, the credit amount is valid and this claim is still pending.' }, { status: 409 })
    scheduleAdminNotifications(access.admin)
    return NextResponse.json({ success: true, status: data })
  } catch {
    return NextResponse.json({ error: 'Could not review payment.' }, { status: 400 })
  }
}
