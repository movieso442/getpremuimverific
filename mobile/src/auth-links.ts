export const nativeAuthRedirect = 'premiumverify://auth/callback'
export type PendingAuth = { state: string; createdAt: number; kind: 'oauth' | 'signup' }
export function isNativeAuthUrl(value: string) {
  try { const u = new URL(value); return u.protocol === 'premiumverify:' && u.hostname === 'auth' && u.pathname === '/callback' && !u.username && !u.password && !u.port } catch { return false }
}
export function isMobileBridgeUrl(value: string) {
  try { const u = new URL(value); return u.origin === 'https://premiumverific.com' && u.pathname === '/auth/mobile-callback' && !u.hash && !u.username && !u.password } catch { return false }
}
export function nativeCallbackUrl(value: string) {
  if (!isMobileBridgeUrl(value)) return value
  return nativeAuthRedirect + new URL(value).search
}
export function nativeAuthCode(value: string, pending: PendingAuth | null, now = Date.now()) {
  const callback = nativeCallbackUrl(value)
  if (!pending || !Number.isFinite(pending.createdAt) || !['oauth','signup'].includes(pending.kind) || !isNativeAuthUrl(callback)) throw new Error('Start sign-in from this app and try again.')
  const url = new URL(callback), age = now - pending.createdAt
  if (age < -60000 || age > (pending.kind === 'signup' ? 86400000 : 900000) || url.searchParams.get('app_state') !== pending.state || url.hash) throw new Error('This sign-in link expired or belongs to another request. Start again in the app.')
  if (url.searchParams.has('error')) throw new Error('Sign-in was not completed. Please try again.')
  const code = url.searchParams.get('code')
  if (!code || !/^[A-Za-z0-9._~-]{1,2048}$/.test(code) || url.searchParams.has('access_token') || url.searchParams.has('refresh_token')) throw new Error('A valid app sign-in code is missing. Start again in the app.')
  return code
}
export function nativeBridgeUrl(origin: string, state: string) {
  const u = new URL(origin)
  if (u.protocol !== 'https:' || u.username || u.password || u.pathname !== '/' || u.search || u.hash) throw new Error('App authentication needs a secure website origin.')
  if (!/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(state)) throw new Error('Invalid app sign-in request.')
  return u.origin + '/auth/mobile-callback?' + new URLSearchParams({ app_state: state })
}
