import { requireAdmin } from '@/lib/admin/auth'
import { syncSmsOrder } from '@/lib/sms/sync'

export async function GET() {
  const access = await requireAdmin()
  if ('error' in access) return Response.json({ error: access.error }, { status: access.status })
  const { data: orders, error } = await access.admin.from('sms_orders')
    .select('id,profile_id,provider_order_id,service_name,country_name,phone_number,price_xaf,status,sms_code,expires_at,created_at')
    .order('created_at', { ascending: false }).limit(100)
  if (error) return Response.json({ error: 'Could not load SMS orders.' }, { status: 503 })
  const profileIds = [...new Set((orders || []).map(order => order.profile_id))]
  const { data: profiles } = profileIds.length
    ? await access.admin.from('profiles').select('id,email,balance_xaf').in('id', profileIds)
    : { data: [] }
  return Response.json({ orders: (orders || []).map(order => ({
    ...order, has_code: Boolean(order.sms_code), sms_code: undefined,
    customer: profiles?.find(profile => profile.id === order.profile_id),
  })) }, { headers: { 'Cache-Control': 'private, no-store' } })
}

export async function POST(request: Request) {
  const access = await requireAdmin()
  if ('error' in access) return Response.json({ error: access.error }, { status: access.status })
  try {
    const { order_id } = await request.json()
    if (typeof order_id !== 'string' || !/^[0-9a-f-]{36}$/i.test(order_id))
      return Response.json({ error: 'Select a valid SMS order.' }, { status: 400 })
    const { data: order } = await access.admin.from('sms_orders')
      .select('id,provider_order_id,phone_number,service_name,profile_id,status')
      .eq('id', order_id).single()
    if (!order?.provider_order_id) return Response.json({ error: 'This order has no recorded supplier ID.' }, { status: 409 })
    const token = process.env.SMS_PROVIDER_API_KEY
    if (!token) return Response.json({ error: 'Production SMS supplier credentials are missing.' }, { status: 503 })
    const baseUrl = (process.env.SMS_PROVIDER_BASE_URL || 'https://5sim.net/v1').replace(/\/$/, '')
    const supplier = await fetch(`${baseUrl}/user/check/${encodeURIComponent(order.provider_order_id)}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(15_000),
    })
    const payload = await supplier.json().catch(() => ({})) as { status?: string; sms?: Array<{ code?: string }> }
    if (!supplier.ok) return Response.json({
      error: supplier.status === 404
        ? 'The production supplier account cannot find this activation (404). Check the supplier account/credential used at purchase; do not assume no SMS was sent.'
        : `Supplier status check failed (HTTP ${supplier.status}).`,
      supplier_http_status: supplier.status,
    }, { status: 409 })
    if (order.status === 'waiting_sms') await syncSmsOrder(access.admin, order)
    const { data: refreshed } = await access.admin.from('sms_orders').select('status,sms_code').eq('id', order.id).single()
    return Response.json({
      supplier_http_status: supplier.status, supplier_status: payload.status || 'UNKNOWN',
      supplier_sms_count: Array.isArray(payload.sms) ? payload.sms.length : null,
      code_received: Boolean(payload.sms?.some(message => message.code) || refreshed?.sms_code),
      local_status: refreshed?.status || order.status,
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return Response.json({ error: 'Supplier check did not complete. The order and wallet were not changed.' }, { status: 503 })
  }
}
