// Non-mutating schema probes against the configured project. Never prints keys.
import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {auth:{persistSession:false,autoRefreshToken:false}})
const {error} = await db.from('payunit_card_checkouts').select('id,profile_id,transaction_id,request_key,checkout_id,checkout_url,expires_at,verify_after').limit(0)
if(error) throw new Error('Card checkout schema is not visible: '+error.code)
const checks = [
  ['reserve_card_topup',{p_profile:'00000000-0000-4000-8000-000000000000',p_key:null,p_amount:0},'Card top-ups must be'],
  ['attach_card_checkout',{p_reference:'schema-probe',p_checkout:null,p_url:null},'Invalid live hosted checkout'],
  ['finalize_card_topup',{p_reference:'schema-probe',p_checkout:null,p_amount:0,p_currency:'XAF',p_mode:'LIVE',p_status:'PENDING'},'Card payment unavailable'],
]
for (const [name,args,message] of checks) {
  const {error} = await db.rpc(name,args)
  if(error?.code!=='P0001'||!error.message.includes(message))throw new Error('Card RPC schema probe failed: '+name+' ('+(error?.code||'unexpected success')+')')
}
console.log('PASS: card checkout table and service RPCs are installed; invalid inputs rejected without creating payments.')
