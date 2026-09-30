import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  const access = await requireAdmin()
  if ('error' in access) return NextResponse.json({ error: access.error }, { status: access.status })
  const { data, error } = await access.admin.from('manual_payment_claims')
    .select('id, profile_id, amount_xaf, payment_method, payer_phone, transfer_reference, status, created_at')
    .order('created_at', { ascending: false }).limit(200)
  if (error) return NextResponse.json({ error: 'Run the latest bot customer SQL upgrade to review manual payments.' }, { status: 500 })
  return NextResponse.json({ claims: data || [] })
}

export async function PATCH(request: Request) {
  try {
    const access = await requireAdmin()
    if ('error' in access) return NextResponse.json({ error: access.error }, { status: access.status })
    const { claim_id, action } = await request.json() as { claim_id?: string; action?: 'confirm' | 'reject' }
    if (!claim_id || !['confirm', 'reject'].includes(action || '')) return NextResponse.json({ error: 'A payment claim and review action are required.' }, { status: 400 })
    const { data: claim, error: claimError } = await access.admin.from('manual_payment_claims')
      .select('id, profile_id, amount_xaf, payment_method, transfer_reference, status').eq('id', claim_id).maybeSingle()
    if (claimError || !claim) return NextResponse.json({ error: 'Payment claim not found.' }, { status: 404 })
    if (claim.status !== 'pending') return NextResponse.json({ error: 'This payment claim was already reviewed.' }, { status: 409 })

    if (action === 'reject') {
      const { error } = await access.admin.from('manual_payment_claims').update({ status: 'rejected', reviewed_by: access.profile.id, reviewed_at: new Date().toISOString() }).eq('id', claim.id).eq('status', 'pending')
      if (error) throw error
      return NextResponse.json({ success: true, status: 'rejected' })
    }

    // The unique ledger reference is the final safety net against duplicate
    // credits even if a staff member double-clicks a review action.
    const ledgerReference = `MANUAL-${claim.id}`
    const { error: updateError } = await access.admin.from('manual_payment_claims')
      .update({ status: 'confirmed', reviewed_by: access.profile.id, reviewed_at: new Date().toISOString() }).eq('id', claim.id).eq('status', 'pending')
    if (updateError) throw updateError
    const { error: transactionError } = await access.admin.from('wallet_transactions').insert({
      profile_id: claim.profile_id,
      amount: Math.round(Number(claim.amount_xaf)),
      type: 'deposit',
      payment_method: claim.payment_method,
      reference: ledgerReference,
      status: 'completed',
      description: `Manual ${claim.payment_method === 'mtn_momo' ? 'MTN MoMo' : 'Orange Money'} payment confirmed. Customer reference: ${claim.transfer_reference}`,
    })
    if (transactionError) {
      await access.admin.from('manual_payment_claims').update({ status: 'pending', reviewed_by: null, reviewed_at: null }).eq('id', claim.id)
      throw transactionError
    }
    return NextResponse.json({ success: true, status: 'confirmed' })
  } catch (error) {
    console.error('[Manual payment review failed]', error)
    return NextResponse.json({ error: 'Could not review this payment claim.' }, { status: 500 })
  }
}
