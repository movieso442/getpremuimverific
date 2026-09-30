import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Enforces administrative access on the server. UI checks are deliberately not
 * relied on: every admin API route calls this before accessing platform data.
 */
export async function requireAdmin() {
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) return { error: 'Sign in is required.', status: 401 as const }

  const admin = createAdminClient()
  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('id, email, full_name, role')
    .eq('user_id', user.id)
    .maybeSingle()

  if (profileError || !profile || profile.role !== 'admin') {
    return { error: 'Administrator access is required.', status: 403 as const }
  }

  return { admin, user, profile }
}
