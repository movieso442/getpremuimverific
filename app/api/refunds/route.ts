import { customerUser } from '@/lib/supabase/customer'
import { createAdminClient } from '@/lib/supabase/admin'
export async function GET(request: Request) {
  const user = await customerUser(request)
  if (!user?.email_confirmed_at || user.is_anonymous) return Response.json({ error: 'Sign in with your verified account to request a refund.' }, { status: 401 })
  const admin = createAdminClient()
  const { data: profile } = await admin.from('profiles').select('id').eq('user_id', user.id).single()
  if (!profile) return Response.json({ error: 'Profile unavailable.' }, { status: 404 })
  const [transactions, requests] = await Promise.all([
    admin.from('wallet_transactions').select('id,reference,amount,type,status,payment_method,created_at').eq('profile_id', profile.id).in('type',['deposit','sms_purchase','smm_order','account_purchase']).order('created_at',{ascending:false}).limit(100),
    admin.from('refund_requests').select('id,transaction_id,state,approved_amount_xaf,review_note,created_at,reviewed_at').eq('profile_id',profile.id).order('created_at',{ascending:false}).limit(100),
  ])
  if (transactions.error || requests.error) return Response.json({ error: 'Refund requests are temporarily unavailable. Contact support with your transaction reference.' }, { status: 503 })
  return Response.json({ transactions: transactions.data, requests: requests.data }, { headers: { 'Cache-Control': 'private, no-store' } })
}
export async function POST(request: Request) {
  try {
    const user = await customerUser(request)
    if (!user?.email_confirmed_at || user.is_anonymous) return Response.json({ error: 'Sign in with your verified account.' }, { status: 401 })
    const body = await request.json()
    if (typeof body.transaction_id !== 'string' || !/^[a-f0-9-]{36}$/i.test(body.transaction_id) || typeof body.reason !== 'string' || body.reason.trim().length<20 || body.reason.length>2000 || body.confirm_ownership!==true) return Response.json({ error: 'Select your transaction, confirm ownership and describe the issue in 20–2,000 characters.' }, { status: 400 })
    const admin = createAdminClient()
    const { data: profile } = await admin.from('profiles').select('id').eq('user_id', user.id).single()
    if (!profile) return Response.json({ error: 'Profile unavailable.' }, { status: 404 })
    const { data, error } = await admin.rpc('submit_refund_request',{p_profile:profile.id,p_transaction:body.transaction_id,p_reason:body.reason.trim()})
    if(error) return Response.json({ error: error.code==='P0001' ? error.message : 'Could not save the request. Please contact support.' }, { status: error.code==='P0001' ? 409 : 503 })
    return Response.json({ success:true,id:data }, {status:201,headers:{'Cache-Control':'no-store'}})
  } catch { return Response.json({error:'Could not submit the request.'},{status:400}) }
}
