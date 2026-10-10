export const ADMIN_OWNER_EMAIL = 'mohammednurdine6@gmail.com'

/** Only Supabase's authenticated, confirmed email grants access, never profile metadata. */
export function isVerifiedOwner(user: { email?: string; email_confirmed_at?: string | null; is_anonymous?: boolean } | null) {
  return Boolean(user && !user.is_anonymous && user.email_confirmed_at && user.email?.toLowerCase() === ADMIN_OWNER_EMAIL)
}
