import { createAdminClient } from '@/lib/supabase/admin'
export async function POST(request: Request) {
  if (request.headers.get('origin') !== new URL(request.url).origin) return Response.json({ error: 'Invalid request.' }, { status: 403 })
  try {
    const token = (await request.formData()).get('token')
    if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) return Response.json({ error: 'Invalid preference link.' }, { status: 400 })
    const { error } = await createAdminClient().from('customer_email_preferences').update({ followups_enabled: false }).eq('unsubscribe_token', token)
    if (error) return Response.json({ error: 'Could not save your preference. Please contact support.' }, { status: 503 })
    return new Response(null, { status: 303, headers: { Location: '/email-preferences?updated=1', 'Cache-Control': 'no-store' } })
  } catch { return Response.json({ error: 'Could not save your preference.' }, { status: 400 }) }
}
