import { NextResponse } from 'next/server'
import { customerUser } from '@/lib/supabase/customer'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'
export async function GET(request: Request) {
  try {
    const user = await customerUser(request)
    if (!user?.email || !user.email_confirmed_at || user.is_anonymous) return NextResponse.json({ error: 'Sign in with a confirmed email account.' }, { status: 401 })
    const admin = createAdminClient()
    const { data: existingProfile, error } = await admin.from('profiles').select('id,email,full_name,balance_xaf,currency').eq('user_id', user.id).maybeSingle()
    let profile = existingProfile
    if (error) throw error
    if (!profile) {
      const inserted = await admin.from('profiles').insert({ user_id: user.id, email: user.email, full_name: String(user.user_metadata?.full_name || user.email.split('@')[0]).slice(0,120), role: 'client', balance_xaf: 0, currency: 'XAF' }).select('id,email,full_name,balance_xaf,currency').single()
      if (inserted.error) {
        const retry = await admin.from('profiles').select('id,email,full_name,balance_xaf,currency').eq('user_id', user.id).maybeSingle()
        if (!retry.data) return NextResponse.json({ error: 'Your account needs support to link its existing profile. No account has been merged automatically.' }, { status: 409 })
        profile = retry.data
      } else profile = inserted.data
    }
    const [transactions, orders] = await Promise.all([
      admin.from('wallet_transactions').select('id,amount,type,status,reference,created_at').eq('profile_id', profile.id).order('created_at', { ascending: false }).limit(50),
      admin.from('smm_orders').select('id,service_name,quantity,charge_xaf,status,created_at').eq('profile_id', profile.id).order('created_at', { ascending: false }).limit(50),
    ])
    if (transactions.error || orders.error) throw transactions.error || orders.error
    return NextResponse.json({ profile, transactions: transactions.data, orders: orders.data }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch { return NextResponse.json({ error: 'Could not load your account. Try again shortly.' }, { status: 503 }) }
}
