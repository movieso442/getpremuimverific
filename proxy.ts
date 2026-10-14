import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { shouldIndex } from './lib/seo'

// Keep the administrator session on its own hostname, separate from customers.
// Authorization is enforced by every admin API, not by this routing helper.
export function proxy(request: NextRequest) {
  const host = request.headers.get('host')?.split(':')[0].toLowerCase()
  if (host === 'admin.premiumverific.com') {
    const path = request.nextUrl.pathname
    if (path === '/robots.txt') return new NextResponse('User-agent: *\nDisallow: /\n', { headers: { 'Content-Type': 'text/plain', 'X-Robots-Tag': 'noindex, nofollow' } })
    if (path === '/sitemap.xml') return new NextResponse(null, { status: 404, headers: { 'X-Robots-Tag': 'noindex, nofollow' } })
    if (path === '/auth/callback') { const response = NextResponse.rewrite(new URL(`/admin/auth/callback${request.nextUrl.search}`, request.url)); response.headers.set('X-Robots-Tag', 'noindex, nofollow'); return response }
    if (path === '/' || path === '/login' || path === '/signup') {
      const response = NextResponse.rewrite(new URL('/admin', request.url))
      response.headers.set('X-Robots-Tag', 'noindex, nofollow')
      return response
    }
  }
  const response = NextResponse.next()
  if (!shouldIndex(request.nextUrl.pathname, host || '', request.nextUrl.searchParams)) response.headers.set('X-Robots-Tag', 'noindex, nofollow')
  return response
}

// Match browser pages on the subdomain (including /login) while leaving API
// webhooks on their original host untouched.
export const config = { matcher: ['/((?!_next/static|_next/image|brand/|favicon.ico|logo.jpg).*)'] }
