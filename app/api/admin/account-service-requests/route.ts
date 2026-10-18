import { requireAdmin } from '@/lib/admin/auth'

export async function GET() {
  const access = await requireAdmin()
  if ('error' in access) return Response.json({ error: access.error }, { status: access.status })
  const { data, error } = await access.admin.from('account_service_requests').select('*')
    .order('created_at', { ascending: false }).limit(200)
  if (error) return Response.json({ error: 'Run account-service-requests-upgrade.sql before loading requests.' }, { status: 503 })
  return Response.json({ requests: data }, { headers: { 'Cache-Control': 'private, no-store' } })
}

export async function PATCH(request: Request) {
  if (request.headers.get('origin') !== new URL(request.url).origin) return Response.json({ error: 'Invalid request origin.' }, { status: 403 })
  const access = await requireAdmin()
  if ('error' in access) return Response.json({ error: access.error }, { status: access.status })
  try {
    const body = await request.json()
    if (typeof body.id !== 'string' || !/^[a-f0-9-]{36}$/i.test(body.id)
      || !['pending','reviewing','quoted','resolved','declined','cancelled'].includes(body.state)
      || typeof body.note !== 'string' || body.note.trim().length < 10 || body.note.length > 1000
      || (body.supplier_id != null && !['beansms','other'].includes(body.supplier_id))
      || (body.quote_xaf != null && (!Number.isInteger(body.quote_xaf) || body.quote_xaf <= 0 || body.quote_xaf > 10000000))
      || (body.state === 'quoted' && body.quote_xaf == null)
      || (body.supplier_cost_amount != null && (typeof body.supplier_cost_amount !== 'number' || !Number.isFinite(body.supplier_cost_amount) || body.supplier_cost_amount < 0 || body.supplier_cost_amount > 10000000))
      || (body.supplier_cost_currency != null && !['USD','XAF'].includes(body.supplier_cost_currency))
      || (body.supplier_reference != null && (typeof body.supplier_reference !== 'string' || body.supplier_reference.length > 200)))
      return Response.json({ error: 'Provide a valid review state, reference and explanation.' }, { status: 400 })
    // Manual requests never debit a wallet or trigger an automatic supplier purchase.
    const { data, error } = await access.admin.from('account_service_requests').update({
      state: body.state, quote_xaf: body.quote_xaf ?? null, supplier_id: body.supplier_id ?? null,
      supplier_reference: body.supplier_reference?.trim() || null, admin_note: body.note.trim(),
      ...(body.supplier_cost_amount !== undefined ? { supplier_cost_amount: body.supplier_cost_amount } : {}),
      ...(body.supplier_cost_currency !== undefined ? { supplier_cost_currency: body.supplier_cost_currency } : {}),
      reviewed_by: access.profile.id, reviewed_at: new Date().toISOString(),
    }).eq('id', body.id).select('id,state').single()
    if (error || !data) return Response.json({ error: 'Could not save the review.' }, { status: 503 })
    return Response.json(data, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch { return Response.json({ error: 'Invalid review request.' }, { status: 400 }) }
}
