import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/auth'

export async function PATCH(request: Request) {
  try {
    const access = await requireAdmin()
    if ('error' in access) return NextResponse.json({ error: access.error }, { status: access.status })
    const body = await request.json() as { profile_id?: string; role?: string }
    if (!body.profile_id || !['client', 'admin'].includes(body.role || '')) return NextResponse.json({ error: 'A valid user and role are required.' }, { status: 400 })
    if (body.profile_id === access.profile.id && body.role !== 'admin') return NextResponse.json({ error: 'You cannot remove your own administrator access.' }, { status: 400 })
    const { error } = await access.admin.from('profiles').update({ role: body.role }).eq('id', body.profile_id)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error('[Admin role update failed]', error)
    return NextResponse.json({ error: 'Could not update the user role.' }, { status: 500 })
  }
}
