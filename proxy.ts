import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Route the dedicated administrator hostname to the protected /admin page.
// Authorization remains inside the page API routes; Proxy only handles hostname routing.
export function proxy(request: NextRequest) {
  const host = request.headers.get('host')?.split(':')[0].toLowerCase()
  if (host === 'admin.premiumverific.com' && request.nextUrl.pathname === '/') {
    // Redirect rather than rewrite so the client layout also sees /admin and
    // renders the isolated administrator shell rather than the public site.
    return NextResponse.redirect(new URL('/admin', request.url))
  }
  return NextResponse.next()
}

export const config = { matcher: '/' }
