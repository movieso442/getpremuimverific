import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { safeNextPath } from '@/lib/auth/flows'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  if (code && code.length <= 2048 && !url.searchParams.has('error')) {
    const client = await createServerSupabaseClient()
    const { error } = await client.auth.exchangeCodeForSession(code)
    if (!error) return new NextResponse(null, { status: 303, headers: { Location: safeNextPath(url.searchParams.get('next')), 'Cache-Control': 'private, no-store', 'Referrer-Policy': 'no-referrer' } })
  }
  return new NextResponse(null, { status: 303, headers: { Location: '/login?error=authentication', 'Cache-Control': 'private, no-store', 'Referrer-Policy': 'no-referrer' } })
}
