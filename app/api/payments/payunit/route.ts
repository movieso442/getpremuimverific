import { NextResponse } from 'next/server'
import { convertCurrency, SupportedCurrency } from '@/lib/currency'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const { amount, currency = 'XAF', return_url, phone_number } = await request.json() as {
      amount?: number; currency?: string; return_url?: string; phone_number?: string
    }
    if (!amount || amount <= 0) return NextResponse.json({ error: 'Valid deposit amount required.' }, { status: 400 })

    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Sign in before adding funds.' }, { status: 401 })
    const admin = createAdminClient()
    const { data: profile, error: profileError } = await admin.from('profiles').select('id').eq('user_id', user.id).single()
    if (profileError || !profile) return NextResponse.json({ error: 'Your wallet profile is unavailable.' }, { status: 409 })

    const inputCurrency = currency.toUpperCase() as SupportedCurrency
    const xafAmount = inputCurrency === 'USD' ? Math.round(convertCurrency(amount, 'USD', 'XAF')) : Math.round(amount)
    const appId = process.env.PAYUNIT_APP_ID
    const apiUser = process.env.PAYUNIT_API_USER
    const apiPassword = process.env.PAYUNIT_API_PASSWORD
    const mode = process.env.PAYUNIT_MODE || 'live'
    const apiKey = mode === 'live' ? process.env.PAYUNIT_LIVE_KEY : process.env.PAYUNIT_API_KEY
    const appUrl = process.env.NEXT_PUBLIC_APP_URL
    if (!appId || !apiUser || !apiPassword || !apiKey || !appUrl)
      return NextResponse.json({ error: 'Payunit is not fully configured. No wallet credit was created.' }, { status: 503 })

    const transactionId = `PV${Date.now()}${Math.floor(Math.random() * 1000)}`
    const { error: pendingError } = await admin.from('wallet_transactions').insert({
      profile_id: profile.id, amount: xafAmount, type: 'deposit', payment_method: 'mtn_momo', reference: transactionId,
      status: 'pending', description: 'Payunit wallet top-up awaiting payment confirmation',
    })
    if (pendingError) throw pendingError

    const baseUrl = mode === 'live' ? 'https://gateway.payunit.net' : 'https://sandbox.payunit.net'
    const headers = {
      'x-api-key': apiKey, mode, 'Content-Type': 'application/json',
      Authorization: `Basic ${Buffer.from(`${apiUser}:${apiPassword}`).toString('base64')}`,
    }
    const paymentResponse = await fetch(`${baseUrl}/api/gateway/initialize`, {
      method: 'POST', headers,
      body: JSON.stringify({
        total_amount: xafAmount, currency: 'XAF', transaction_id: transactionId,
        return_url: return_url || `${appUrl}/add-funds?ref=${transactionId}`,
        notify_url: `${appUrl}/api/payments/webhooks/payunit`, payment_country: 'CM',
        description: `Premium Verify wallet top-up (${xafAmount} XAF)`,
      }), signal: AbortSignal.timeout(20_000),
    })
    const payment = await paymentResponse.json().catch(() => ({})) as { status?: string; data?: { transaction_url?: string; payment_url?: string }; message?: string }
    const paymentUrl = payment.data?.transaction_url || payment.data?.payment_url
    if (!paymentResponse.ok || payment.status !== 'SUCCESS' || !paymentUrl) {
      await admin.from('wallet_transactions').update({ status: 'failed' }).eq('reference', transactionId)
      return NextResponse.json({ error: payment.message || 'Payunit could not initialize the payment.' }, { status: 502 })
    }
    return NextResponse.json({ success: true, status: 'REDIRECT', payment_url: paymentUrl, reference: transactionId, amount: xafAmount })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Payunit transaction processing failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
