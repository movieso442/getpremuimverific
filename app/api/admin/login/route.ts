import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { ADMIN_OWNER_EMAIL, isVerifiedOwner } from '@/lib/admin/owner'
import { matchesAdminPassword } from '@/lib/admin/password'

export const runtime = 'nodejs'
const reply = (error: string, status: number) => Response.json({ error }, { status, headers: { 'Cache-Control': 'no-store' } })

export async function POST(request: Request) {
  if (request.headers.get('origin') !== new URL(request.url).origin) return reply('Invalid sign-in request.', 403)
  try {
    const text = await request.text()
    if (text.length > 4096) return reply('Invalid sign-in request.', 400)
    const body = JSON.parse(text)
    if (body?.email !== ADMIN_OWNER_EMAIL || typeof body.password !== 'string' || !body.password || body.password.length > 1024) return reply('Invalid email or password.', 401)
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !anonKey) return reply('Administrator sign-in is not configured.', 503)

    // Supabase verifies the actual password and enforces its authentication rate
    // limits. Do not mint an owner session from an env-password comparison alone.
    // This temporary client cannot write browser cookies before every check passes.
    const auth = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } })
    const { data, error } = await auth.auth.signInWithPassword({ email: ADMIN_OWNER_EMAIL, password: body.password })
    const matches = matchesAdminPassword(body.password, process.env.ADMIN_LOGIN_PASSWORD)
    if (error || !data.session || !isVerifiedOwner(data.user) || !matches) {
      if (data.session) await auth.auth.signOut({ scope: 'local' })
      return reply('Invalid email or password, or owner access is not enabled.', error?.status === 429 ? 429 : 401)
    }
    const supabase = await createServerSupabaseClient()
    const result = await supabase.auth.setSession({ access_token: data.session.access_token, refresh_token: data.session.refresh_token })
    if (result.error) return reply('Could not create the administrator session. Please retry.', 503)
    return Response.json({ success: true }, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return reply('Could not sign in. Check the credentials and retry.', 400)
  }
}
