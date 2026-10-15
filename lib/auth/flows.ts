export function safeNextPath(value: string | null | undefined, fallback = '/dashboard') {
  if (!value || !value.startsWith('/') || value.startsWith('//') || /[\\\u0000-\u001f\u007f]/.test(value)) return fallback
  try { return new URL(value, 'https://premiumverific.com').origin === 'https://premiumverific.com' ? value : fallback } catch { return fallback }
}
export function webAuthCallback(origin: string, next?: string | null) {
  const url = new URL('/auth/callback', origin)
  url.searchParams.set('next', safeNextPath(next))
  return url.href
}
export const signupNotice = 'Signup request accepted. If this address needs confirmation, check your inbox and spam folder. Already registered—especially with Google? Sign in using your existing method; another signup email may not be sent.'
export function authErrorMessage(error: unknown) {
  const e = error as { code?: string; message?: string }
  if (e?.code === 'over_email_send_rate_limit' || /email rate limit/i.test(e?.message || '')) return 'Too many email requests. Please wait before trying again, or use Google sign-in.'
  if (e?.code === 'email_address_not_authorized') return 'Email delivery is not configured for this address yet. Use Google sign-in or contact support.'
  if (e?.code === 'email_not_confirmed') return 'Confirm your email first, or request another confirmation from Sign Up. If you registered with Google, use Continue with Google.'
  return e?.message || 'Authentication could not be completed. Please try again.'
}
export function mobileReturnUrl(search: string) {
  const params = new URLSearchParams(search)
  const state = params.get('app_state'), code = params.get('code')
  if (params.has('error') || params.has('access_token') || params.has('refresh_token') || !state || !/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(state) || !code || !/^[A-Za-z0-9._~-]{1,2048}$/.test(code)) return null
  // Fixed destination. Never relay access/refresh tokens, user-supplied URLs,
  // or exchange this app-bound PKCE code with the website's cookie client.
  return 'premiumverify://auth/callback?' + new URLSearchParams({ code, app_state: state })
}
