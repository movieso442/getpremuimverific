import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { full_name, avatar_url, phone_number } = body
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.email) return NextResponse.json({ error: 'Sign in before syncing a profile.' }, { status: 401 })
    const email = user.email

    if (!email) {
      return NextResponse.json({ error: 'User email is required' }, { status: 400 })
    }

    const supabaseAdmin = createAdminClient()

    // Check if profile exists
    const { data: existingProfile, error: fetchErr } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('email', email)
      .maybeSingle()

    if (existingProfile) {
      return NextResponse.json({
        success: true,
        action: 'existing',
        profile: existingProfile
      })
    }

    // Insert new profile using Service Role Key
    const displayName = full_name || email.split('@')[0] || 'Premium Member'
    const { data: newProfile, error: insertErr } = await supabaseAdmin
      .from('profiles')
      .insert({
        user_id: user.id,
        email: email,
        full_name: displayName,
        avatar_url: avatar_url || null,
        phone_number: phone_number || '+237680209047',
        balance_xaf: 0,
        currency: 'XAF',
        role: 'client'
      })
      .select()
      .single()

    if (insertErr) {
      console.error('[Sync User Admin Insert Error]:', insertErr)
      return NextResponse.json({ error: insertErr.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      action: 'created',
      profile: newProfile
    })
  } catch (err: any) {
    console.error('[Sync User Route Error]:', err)
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}
