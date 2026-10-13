import { createHash, timingSafeEqual } from 'node:crypto'

/** Server-only comparison; never import this module from a client component. */
export function matchesAdminPassword(submitted: string, configured: string | undefined) {
  if (!configured) return true // Existing Supabase owner login remains the default.
  const digest = (value: string) => createHash('sha256').update(value, 'utf8').digest()
  return timingSafeEqual(digest(submitted), digest(configured))
}
