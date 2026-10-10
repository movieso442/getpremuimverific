import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createServerSupabaseClient } from '@/lib/supabase/server'

const ALLOWED_EVENTS = new Set(['page_view', 'checkout_started', 'checkout_redirected', 'checkout_start_failed'])

export async function POST(request: Request) {
  try {
    const body = await request.json() as { event_type?: string; path?: string; session_id?: string; metadata?: Record<string, unknown> }
    if (!body.event_type || !ALLOWED_EVENTS.has(body.event_type) || !body.path?.startsWith('/')) {
      return NextResponse.json({ error: 'Invalid analytics event.' }, { status: 400 })
    }
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    const admin = createAdminClient()
    let profileId: string | null = null
    if (user) {
      const { data: profile } = await admin.from('profiles').select('id').eq('user_id', user.id).maybeSingle()
      profileId = profile?.id || null
    }
    const { error } = await admin.from('audit_events').insert({
      event_type: body.event_type,
      path: body.path.slice(0, 300),
      session_id: typeof body.session_id === 'string' ? body.session_id.slice(0, 100) : null,
      profile_id: profileId,
      metadata: body.metadata && typeof body.metadata === 'object' ? body.metadata : {},
    })
    if (error) throw error
    return NextResponse.json({ recorded: true })
  } catch {
    return NextResponse.json({ recorded: false }, { status: 202 })
  }
}
