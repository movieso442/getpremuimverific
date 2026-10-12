import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from './server'

/** Native clients use a verified access token; browsers retain cookie auth.
 * Never trust a customer-supplied profile ID, email, or decoded JWT alone. */
export async function customerUser(request: Request) {
  const authorization = request.headers.get('authorization')
  if (authorization !== null) {
    const match = /^Bearer ([^\s]+)$/i.exec(authorization)
    if (!match || match[1].length > 8192) return null
    const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false, autoRefreshToken: false } })
    const { data, error } = await client.auth.getUser(match[1])
    return error ? null : data.user
  }
  const client = await createServerSupabaseClient()
  const { data, error } = await client.auth.getUser()
  return error ? null : data.user
}
