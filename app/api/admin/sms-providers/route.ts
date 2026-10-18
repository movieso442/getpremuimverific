import {requireAdmin} from '@/lib/admin/auth'
import {BeanSmsError,readBeanSmsCatalogue} from '@/lib/providers/beansms'
export async function GET(){
 const access=await requireAdmin()
 if('error' in access)return Response.json({error:access.error},{status:access.status})
 const [providers,services,orders]=await Promise.all([
  access.admin.from('sms_providers').select('*').order('id'),
  access.admin.from('sms_provider_services').select('*').order('canonical_service').limit(1000),
  access.admin.from('sms_provider_orders').select('*').order('created_at',{ascending:false}).limit(500),
 ])
 if(providers.error||services.error||orders.error)return Response.json({error:'Run sms-providers-upgrade.sql before loading supplier records.'},{status:503})
 return Response.json({providers:providers.data,services:services.data,orders:orders.data,beansms_credentials_configured:Boolean(process.env.BEANSMS_API_KEY&&process.env.BEANSMS_API_SECRET),notice:'Latest 500 orders only. Unknown historical costs are not profit. BeanSMS ordering remains disabled pending live catalogue and lifecycle verification.'},{headers:{'Cache-Control':'private, no-store'}})
}
export async function POST(){
 const access=await requireAdmin()
 if('error' in access)return Response.json({error:access.error},{status:access.status})
 try {
  // Read-only diagnostic; no purchase, deposit, mapping activation or secret output.
  const catalogue=await readBeanSmsCatalogue()
  // Also redact unexpected credential echoes from the supplier response.
  const safeCatalogue=JSON.parse(JSON.stringify(catalogue,(key,value)=>{
   if(/secret|api[_-]?key|authorization|token/i.test(key))return '[redacted]'
   if(typeof value==='string')for(const secret of [process.env.BEANSMS_API_KEY,process.env.BEANSMS_API_SECRET])if(secret)value=value.replaceAll(secret,'[redacted]')
   return value
  }))
  return Response.json({catalogue:safeCatalogue,notice:'Inspect provider IDs, price currency and stock response before importing verified mappings. No orders were placed.'},{headers:{'Cache-Control':'private, no-store'}})
 } catch(error){
  if(error instanceof BeanSmsError && error.status===401)return Response.json({error:'BeanSMS rejected the configured API key and secret. Replace both server-side credentials, then retry the read-only check. No order was placed.'},{status:503,headers:{'Cache-Control':'private, no-store'}})
  return Response.json({error:'BeanSMS read-only check failed. Verify supplier availability and try again. No order was placed.'},{status:503,headers:{'Cache-Control':'private, no-store'}})
 }
}
