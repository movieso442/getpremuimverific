import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Supabase sessions are host-scoped. Route the administrator hostname to the
// primary domain's protected page so a customer who has just signed in on
// premiumverific.com does not appear signed out again on the subdomain.
// Authorization remains inside the page API routes.
export function proxy(request: NextRequest) {
  const host = request.headers.get('host')?.split(':')[0].toLowerCase()
  if (host === 'admin.premiumverific.com' && !request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.redirect(new URL('/admin', 'https://premiumverific.com'))
  }
  return NextResponse.next()
}

// Match browser pages on the subdomain (including /login) while leaving API
// webhooks on their original host untouched.
export const config = { matcher: ['/((?!api/).*)'] }
