import { requireAdmin } from '@/lib/admin/auth'

export async function GET() {
  try {
    const access = await requireAdmin()
    if ('error' in access) return Response.json({ error: access.error }, { status: access.status, headers: { 'Cache-Control': 'no-store' } })
    return Response.json({ email: access.user.email }, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return Response.json({ error: 'Administrator sign-in is unavailable. Check the server configuration.' }, { status: 503 })
  }
}
