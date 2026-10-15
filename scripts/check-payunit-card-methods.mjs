// Creates one UNPAID provider-only draft to list live merchant methods.
// No customer ledger, card details, approval prompt or charge is created.
import { randomUUID } from 'node:crypto'
import { getPayunitConfig } from '../lib/payments/payunit.ts'
if (!process.argv.includes('--create-unpaid-probe')) throw new Error('Explicit --create-unpaid-probe is required.')
const config = getPayunitConfig()
if (!config || config.mode !== 'live') throw new Error('Live Payunit credentials are required.')
const response = await fetch(config.baseUrl+'/api/gateway/initialize', {method:'POST',redirect:'error',signal:AbortSignal.timeout(20000),headers:config.headers,body:JSON.stringify({
  total_amount:3000,currency:'XAF',transaction_id:'PX'+randomUUID().replaceAll('-','').slice(0,17),app_id:config.appId,
  return_url:config.appUrl+'/payments/card-return',notify_url:config.appUrl+'/api/payments/webhooks/payunit-card',description:'Integration capability check - DO NOT PAY',
})})
const payload = await response.json().catch(()=>null)
if (!response.ok || payload?.status !== 'SUCCESS') throw new Error('Merchant method probe was not accepted (HTTP '+response.status+').')
let providers = payload.data?.providers
if (!Array.isArray(providers)) {
  const params = new URLSearchParams()
  for (const name of ['t_id','t_sum','t_url']) { if (typeof payload.data?.[name] !== 'string') throw new Error('Provider capability listing unavailable.'); params.set(name,payload.data[name]) }
  const listed = await fetch(config.baseUrl+'/api/gateway/gateways?'+params,{headers:config.headers,redirect:'error',signal:AbortSignal.timeout(20000)})
  const result = await listed.json().catch(()=>null)
  if(!listed.ok || result?.status!=='SUCCESS' || !Array.isArray(result.data)) throw new Error('Could not read merchant methods.')
  providers=result.data
}
console.log(JSON.stringify({mode:config.mode,unpaid_probe:true,methods:providers.map(p=>({code:p.shortcode,name:p.name,status:p.status}))},null,2))
