import type {SupabaseClient} from '@supabase/supabase-js'
import {getPayunitConfig} from './payunit'
import {cardProof,hostedCardUrl} from './cards'
export function cardCheckoutEnabled(){return process.env.PAYUNIT_CARD_ENABLED==='true'&&getPayunitConfig()?.mode==='live'}
export async function initializeCardCheckout(reference:string,amount:number){
 const config=getPayunitConfig()
 if(!config||config.mode!=='live')throw new Error('Live hosted card checkout is not configured.')
 const origin=new URL(config.appUrl)
 if(origin.protocol!=='https:'||origin.username||origin.password||origin.pathname!=='/'||origin.search||origin.hash)throw new Error('A secure public payment origin is required.')
 const response=await fetch(`${config.baseUrl}/api/gateway/checkout/initialize`,{method:'POST',redirect:'error',headers:config.headers,signal:AbortSignal.timeout(20000),body:JSON.stringify({
  cancel_url:`${config.appUrl}/payments/card-return?ref=${reference}`,success_url:`${config.appUrl}/payments/card-return?ref=${reference}`,notify_url:`${config.appUrl}/api/payments/webhooks/payunit-card`,currency:'XAF',mode:'payment',transaction_id:reference,total_amount:amount,
  items:[{price_description:{unit_amount:amount},product_description:{name:'Premium Verific wallet top-up',image_url:`${config.appUrl}/brand/icon-512.png`,about_product:'Wallet credit for Premium Verific services, including the disclosed 1.4% card top-up fee.'},quantity:1}],meta:{phone_number_collection:false,address_collection:true},
 })})
 const payload=await response.json().catch(()=>null)
 // Any unexpected/ambiguous response stays pending. Never initialize twice.
 const checkout=payload?.status==='SUCCESS'?hostedCardUrl(payload.data?.redirect,payload.data?.checkout_id):null
 if(!response.ok||!checkout)throw new Error('Checkout initialization could not be confirmed. Check this payment before trying again.')
 return checkout
}
export async function reconcileCard(admin:SupabaseClient,transaction:{reference:string;amount:number|string;service_fee_xaf:number|string;status:string}){
 if(transaction.status!=='pending')return transaction.status
 const config=getPayunitConfig()
 if(!config||config.mode!=='live')return 'pending'
 const claim=await admin.rpc('claim_card_verification',{p_reference:transaction.reference})
 if(claim.error)throw new Error('Card verification is temporarily unavailable.')
 if(!claim.data)return 'pending'
 const checkoutId=String(claim.data)
 if(!/^PU_LIVE_[a-f0-9-]{36}$/i.test(checkoutId))throw new Error('Invalid stored checkout.')
 const response=await fetch(`${config.baseUrl}/api/gateway/checkout/status/${encodeURIComponent(checkoutId)}`,{headers:config.headers,redirect:'error',cache:'no-store',signal:AbortSignal.timeout(15000)})
 const payload:unknown=await response.json().catch(()=>null)
 const proof=response.ok?cardProof(payload,{checkoutId,reference:transaction.reference,amount:Number(transaction.amount)+Number(transaction.service_fee_xaf)}):null
 if(!proof)return 'pending'
 const result=await admin.rpc('finalize_card_topup',{p_reference:proof.reference,p_checkout:proof.checkoutId,p_amount:proof.amount,p_currency:proof.currency,p_mode:proof.mode,p_status:proof.status})
 if(result.error)throw new Error('Card verification could not be committed. Check the same payment again.')
 return String(result.data)
}
