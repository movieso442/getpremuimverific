import type {SupabaseClient} from '@supabase/supabase-js'
/** Optional migration: old installations remain usable, missing costs stay unknown. */
export async function recordFiveSimCost(admin:SupabaseClient,input:{orderId:string;quoteUsd:number;actualUsd?:number;operator:string;service:string;country:string}) {
 const actual=input.actualUsd!==undefined&&Number.isFinite(input.actualUsd)&&input.actualUsd>0?input.actualUsd:null
 // Store raw supplier values. Existing checkout assumes USD * 600, but this is
 // not a verified acquisition cost until currency and wallet settlement agree.
 const {error}=await admin.from('sms_provider_orders').update({quoted_supplier_amount:input.quoteUsd,actual_supplier_amount:actual,supplier_operator:input.operator,supplier_service:input.service,supplier_country:input.country}).eq('sms_order_id',input.orderId).eq('provider_id','fivesim')
 if(error) console.warn('[SMS supplier accounting unavailable] Run sms-providers-upgrade.sql; supplier cost was not recorded.')
}
