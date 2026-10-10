import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { isVerifiedOwner } from '@/lib/admin/owner'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const supabase = await createServerSupabaseClient()
  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error && isVerifiedOwner(data.user)) {
      // Relative locations retain the browser's admin hostname even when
      // a reverse proxy gives the server an internal request origin.
      return new NextResponse(null, { status: 303, headers: { Location: '/admin', 'Cache-Control': 'no-store' } })
    }
    await supabase.auth.signOut({ scope: 'local' })
  }
  return new NextResponse(null, { status: 303, headers: { Location: '/admin/login?error=authentication', 'Cache-Control': 'no-store' } })
}
