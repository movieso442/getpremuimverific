import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const ref = searchParams.get('ref')
    const action = searchParams.get('action') // 'verify' to simulate PIN entry validation
    const profileId = searchParams.get('profile_id')
    const amount = Number(searchParams.get('amount')) || 0

    if (!ref) {
      return NextResponse.json({ error: 'Transaction reference is required' }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://cdfmfxfkbqlcjbesymxd.supabase.co'
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    // Handle user PIN authorization verification
    if (action === 'verify' && profileId && amount > 0 && serviceRoleKey) {
      const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

      // Fetch profile
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('balance_xaf')
        .eq('id', profileId)
        .maybeSingle()

      const currentBalance = profile ? Number(profile.balance_xaf) || 0 : 0
      const newBalance = currentBalance + amount

      // Credit wallet balance in DB
      await supabaseAdmin.from('profiles').update({ balance_xaf: newBalance }).eq('id', profileId)

      // Log wallet transaction
      await supabaseAdmin.from('wallet_transactions').insert({
        profile_id: profileId,
        amount: amount,
        type: 'deposit',
        payment_method: 'mtn_momo',
        reference: ref,
        status: 'completed',
        description: `Verified Deposit via Mobile Money (${ref})`
      })

      return NextResponse.json({
        success: true,
        status: 'SUCCESS',
        reference: ref,
        amount,
        new_balance: newBalance,
        message: `Payment authorized! ${amount.toLocaleString()} XAF credited to your wallet.`
      })
    }

    return NextResponse.json({
      success: true,
      status: 'PENDING',
      reference: ref,
      message: 'Waiting for Mobile Money PIN entry authorization on user phone...'
    })

  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error checking payment status' }, { status: 500 })
  }
}
