import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Keep the administrator session on its own hostname, separate from customers.
// Authorization is enforced by every admin API, not by this routing helper.
export function proxy(request: NextRequest) {
  const host = request.headers.get('host')?.split(':')[0].toLowerCase()
  if (host === 'admin.premiumverific.com') {
    const path = request.nextUrl.pathname
    if (path === '/auth/callback') return NextResponse.rewrite(new URL(`/admin/auth/callback${request.nextUrl.search}`, request.url))
    if (path === '/' || path === '/login' || path === '/signup') {
      return NextResponse.rewrite(new URL('/admin', request.url))
    }
  }
  return NextResponse.next()
}

// Match browser pages on the subdomain (including /login) while leaving API
// webhooks on their original host untouched.
export const config = { matcher: ['/', '/login', '/signup', '/auth/callback'] }
