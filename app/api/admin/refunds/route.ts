import { requireAdmin } from '@/lib/admin/auth'
import { syncSmmOrder } from '@/lib/smm/sync'
import { scheduleAdminNotifications } from '@/lib/notifications/admin-email'
import { syncSmsOrder } from '@/lib/sms/sync'
export async function GET() {
  const access=await requireAdmin()
  if('error' in access)return Response.json({error:access.error},{status:access.status})
  const {data:requests,error}=await access.admin.from('refund_requests').select('*').order('created_at',{ascending:false}).limit(100)
  if(error)return Response.json({error:'Run the refund-process SQL migration before reviewing refunds.'},{status:503})
  const ids=(requests||[]).map(request=>request.transaction_id)
  const transactions=ids.length ? await access.admin.from('wallet_transactions').select('id,reference,amount,type,payment_method,status,created_at').in('id',ids) : {data:[],error:null}
  if(transactions.error)return Response.json({error:'Could not load the original ledger records.'},{status:503})
  const profileIds=[...new Set((requests||[]).map(request=>request.profile_id))]
  const profiles=profileIds.length ? await access.admin.from('profiles').select('id,email,full_name,balance_xaf').in('id',profileIds) : {data:[],error:null}
  if(profiles.error)return Response.json({error:'Could not load customer details.'},{status:503})
  return Response.json({requests:(requests||[]).map(request=>({...request,transaction:transactions.data?.find(tx=>tx.id===request.transaction_id),customer:profiles.data?.find(profile=>profile.id===request.profile_id)}))},{headers:{'Cache-Control':'private, no-store'}})
}
export async function POST(request:Request) {
  const access=await requireAdmin()
  if('error' in access)return Response.json({error:access.error},{status:access.status})
  try {
    const body=await request.json()
    if(typeof body.request_id!=='string'||!['approve','reject','mark_paid','reopen'].includes(body.action)||typeof body.note!=='string'||body.note.trim().length<20||body.note.length>2000)return Response.json({error:'Choose a valid action and provide a verified explanation of at least 20 characters.'},{status:400})
    const {data:claim}=await access.admin.from('refund_requests').select('transaction_id').eq('id',body.request_id).single()
    if(!claim)return Response.json({error:'Request unavailable.'},{status:404})
    const {data:source}=await access.admin.from('wallet_transactions').select('id,type,reference,profile_id').eq('id',claim.transaction_id).single()
    if(!source)return Response.json({error:'Original transaction unavailable.'},{status:409})
    if(body.action==='approve') {
      if(!Number.isInteger(body.amount_xaf)||body.amount_xaf<=0||body.verified!==true)return Response.json({error:'Verify original ownership, delivery, provider settlement, prior refunds and disputes before approving.'},{status:400})
      if(source.type==='smm_order') {
        const {data:order}=await access.admin.from('smm_orders').select('id,api_order_id,quantity').eq('id',source.reference.slice(4)).eq('profile_id',source.profile_id).single()
        if(!order||(await syncSmmOrder(access.admin,order)).updated!==true)return Response.json({error:'Live provider status could not be verified. Keep the request pending.'},{status:409})
      }
      if(source.type==='sms_purchase') {
        const {data:order}=await access.admin.from('sms_orders').select('id,provider_order_id,phone_number,service_name,profile_id,status,sms_code').eq('id',source.reference.replace(/^(BOT-)?SMS-/, '')).eq('profile_id',source.profile_id).single()
        if(!order?.provider_order_id||order.sms_code)return Response.json({error:'SMS order is missing or a code was already delivered.'},{status:409})
        let providerOutcome: string
        try { providerOutcome=(await syncSmsOrder(access.admin,order)).status }
        catch { return Response.json({error:'Live provider verification failed. Keep this request pending and investigate the supplier account before refunding.'},{status:409}) }
        if(!['canceled','expired'].includes(providerOutcome))return Response.json({error:'The supplier has not confirmed an undelivered, closed activation.'},{status:409})
        const {data:verified}=await access.admin.from('sms_orders').select('status,sms_code').eq('id',order.id).single()
        if(!verified||verified.sms_code||!['canceled','expired'].includes(verified.status))return Response.json({error:'Provider has not confirmed a closed, undelivered activation.'},{status:409})
      }
    }
    if(body.action==='mark_paid'&&(body.verified!==true||typeof body.payout_reference!=='string'||body.payout_reference.length>200))return Response.json({error:'Verify the original-source payout and provide its settlement reference.'},{status:400})
    const {data,error}=await access.admin.rpc('review_refund_request',{p_request:body.request_id,p_reviewer:access.profile.id,p_action:body.action,p_amount:body.action==='approve'?body.amount_xaf:null,p_note:body.note.trim(),p_payout_reference:body.payout_reference||null})
    if(error)return Response.json({error:error.code==='P0001'?error.message:'Refund review failed; no new credit was committed.'},{status:409})
    scheduleAdminNotifications(access.admin)
    return Response.json({success:true,state:data},{headers:{'Cache-Control':'no-store'}})
  } catch{return Response.json({error:'Could not review this request. Check its status before retrying.'},{status:400})}
}
