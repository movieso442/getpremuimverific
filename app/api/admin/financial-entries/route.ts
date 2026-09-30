import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/auth'

const allowedKinds = new Set(['provider_cost', 'payment_fee', 'operating_expense', 'adjustment'])

export async function POST(request: Request) {
  try {
    const access = await requireAdmin()
    if ('error' in access) return NextResponse.json({ error: access.error }, { status: access.status })
    const body = await request.json() as { kind?: string; amount_xaf?: number; description?: string; reference?: string }
    const amount = Number(body.amount_xaf)
    if (!body.kind || !allowedKinds.has(body.kind) || !Number.isFinite(amount) || amount <= 0 || !body.description?.trim()) {
      return NextResponse.json({ error: 'A valid expense type, amount, and description are required.' }, { status: 400 })
    }
    const { error } = await access.admin.from('financial_entries').insert({
      kind: body.kind, amount_xaf: Math.round(amount), description: body.description.trim(), reference: body.reference?.trim() || null, created_by: access.profile.id,
    })
    if (error) throw error
    return NextResponse.json({ success: true }, { status: 201 })
  } catch (error: unknown) {
    console.error('[Financial entry failed]', error)
    return NextResponse.json({ error: 'Could not record the expense. Ensure the latest database schema has been applied.' }, { status: 500 })
  }
}
