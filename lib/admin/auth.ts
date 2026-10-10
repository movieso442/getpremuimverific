import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isVerifiedOwner } from './owner'

/**
 * Enforces administrative access on the server. UI checks are deliberately not
 * relied on: every admin API route calls this before accessing platform data.
 */
export async function requireAdmin() {
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) return { error: 'Sign in is required.', status: 401 as const }
  if (!isVerifiedOwner(user)) return { error: 'This portal is restricted to the verified owner account.', status: 403 as const }

  const admin = createAdminClient()
  const { data: existingProfile, error: profileError } = await admin
    .from('profiles')
    .select('id, email, full_name, role')
    .eq('user_id', user.id)
    .maybeSingle()

  if (profileError) return { error: 'Could not load the administrator profile.', status: 503 as const }
  let profile = existingProfile
  // Bootstrap only the verified owner. This also makes the role-based payment
  // review RPC work without asking the owner to edit their role manually.
  if (!profile || profile.role !== 'admin') {
    const result = profile
      ? await admin.from('profiles').update({ role: 'admin' }).eq('id', profile.id).eq('user_id', user.id).select('id, email, full_name, role').single()
      : await admin.from('profiles').insert({ user_id: user.id, email: user.email!, role: 'admin', full_name: 'Platform owner' }).select('id, email, full_name, role').single()
    if (result.error || !result.data) return { error: 'Could not prepare the administrator profile. Please retry or check the database configuration.', status: 503 as const }
    profile = result.data
  }

  return { admin, user, profile }
}
