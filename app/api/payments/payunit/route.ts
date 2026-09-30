import { NextResponse } from 'next/server'
import { convertCurrency, SupportedCurrency } from '@/lib/currency'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getPayunitConfig, paymentErrorMessage, PayunitStatusResponse } from '@/lib/payments/payunit'

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
    const payunit = getPayunitConfig()
    if (!payunit)
      return NextResponse.json({ error: 'Payunit is not fully configured. No wallet credit was created.' }, { status: 503 })

    const transactionId = `PV${Date.now()}${Math.floor(Math.random() * 1000)}`
    const { error: pendingError } = await admin.from('wallet_transactions').insert({
      profile_id: profile.id, amount: xafAmount, type: 'deposit', payment_method: 'mtn_momo', reference: transactionId,
      status: 'pending', description: 'Payunit wallet top-up awaiting payment confirmation',
    })
    if (pendingError) throw pendingError

    const paymentResponse = await fetch(`${payunit.baseUrl}/api/gateway/initialize`, {
      method: 'POST', headers: payunit.headers,
      body: JSON.stringify({
        total_amount: xafAmount, currency: 'XAF', transaction_id: transactionId,
        // Never accept an arbitrary browser return URL; it would create an open redirect.
        return_url: `${payunit.appUrl}/add-funds?ref=${transactionId}`,
        notify_url: `${payunit.appUrl}/api/payments/webhooks/payunit`,
        app_id: payunit.appId,
        payment_country: 'CM',
        description: `Premium Verify wallet top-up (${xafAmount} XAF)`,
      }), signal: AbortSignal.timeout(20_000),
    })
    const payment = await paymentResponse.json().catch(() => ({})) as PayunitStatusResponse
    const paymentUrl = payment.data?.transaction_url || payment.data?.payment_url
    if (!paymentResponse.ok || payment.status !== 'SUCCESS' || !paymentUrl) {
      await admin.from('wallet_transactions').update({ status: 'failed' }).eq('reference', transactionId)
      console.error('[Payunit initialize rejected]', { status: paymentResponse.status, providerStatus: payment.status, message: payment.message, reference: transactionId })
      return NextResponse.json({ error: paymentErrorMessage(payment) }, { status: 502 })
    }
    return NextResponse.json({ success: true, status: 'REDIRECT', payment_url: paymentUrl, reference: transactionId, amount: xafAmount })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Payunit transaction processing failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/** Fallback status check for the return page when a provider webhook is delayed. */
export async function GET(request: Request) {
  try {
    const reference = new URL(request.url).searchParams.get('ref')
    if (!reference) return NextResponse.json({ error: 'Payment reference is required.' }, { status: 400 })

    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Sign in is required.' }, { status: 401 })

    const admin = createAdminClient()
    const { data: profile } = await admin.from('profiles').select('id').eq('user_id', user.id).maybeSingle()
    const { data: transaction } = await admin.from('wallet_transactions')
      .select('id, amount, status, reference').eq('profile_id', profile?.id || '').eq('reference', reference).maybeSingle()
    if (!transaction) return NextResponse.json({ error: 'Payment reference was not found.' }, { status: 404 })
    if (transaction.status === 'completed') return NextResponse.json({ status: 'completed', credited: true })

    const payunit = getPayunitConfig()
    if (!payunit) return NextResponse.json({ status: transaction.status, credited: false })
    const { response, payload } = await (await import('@/lib/payments/payunit')).getPayunitPaymentStatus(reference, payunit)
    const isCompleted = response.ok && payload.status === 'SUCCESS' && payload.data?.transaction_status === 'SUCCESS'
      && payload.data.transaction_currency === 'XAF' && Number(payload.data.transaction_amount) === Number(transaction.amount)
    if (isCompleted && transaction.status === 'pending') {
      const { error } = await admin.from('wallet_transactions').update({ status: 'completed' }).eq('id', transaction.id).eq('status', 'pending')
      if (error) throw error
    }
    return NextResponse.json({ status: isCompleted ? 'completed' : transaction.status, credited: isCompleted })
  } catch (error: unknown) {
    console.error('[Payunit status check failed]', error)
    return NextResponse.json({ error: 'Could not confirm this payment yet.' }, { status: 502 })
  }
}
