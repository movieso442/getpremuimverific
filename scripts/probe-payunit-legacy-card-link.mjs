// Alternative documented SDK/Collect flow: initialize an UNPAID card-requested
// transaction and inspect its public redirect. No charge or customer ledger.
import {writeFile} from 'node:fs/promises'
import {randomUUID} from 'node:crypto'
import {getPayunitConfig} from '../lib/payments/payunit.ts'
if(!process.argv.includes('--create-unpaid-probe'))throw new Error('Explicit unpaid probe flag required.')
const config=getPayunitConfig()
if(!config||config.mode!=='live')throw new Error('Live credentials required.')
const response=await fetch(config.baseUrl+'/api/gateway/initialize',{method:'POST',headers:config.headers,redirect:'error',signal:AbortSignal.timeout(20000),body:JSON.stringify({
 total_amount:3042,currency:'XAF',transaction_id:'PX'+randomUUID().replaceAll('-','').slice(0,17),pay_with:'WORLD_VISA',
 return_url:config.appUrl+'/payments/card-return',notify_url:config.appUrl+'/api/payments/webhooks/payunit-card',description:'Integration card capability check - DO NOT PAY',
})})
const payload=await response.json().catch(()=>null)
const url=payload?.data?.transaction_url
if(!response.ok||payload?.status!=='SUCCESS'||typeof url!=='string')throw new Error('Alternative initialization unavailable: HTTP '+response.status)
const parsed=new URL(url)
if(parsed.protocol!=='https:'||!(parsed.hostname==='payunit.net'||parsed.hostname.endsWith('.payunit.net'))||parsed.username||parsed.password)throw new Error('Alternative checkout URL is not a secure Payunit origin.')
await writeFile('.vercel/legacy-card-capability-probe.json',JSON.stringify({url},null,2))
console.log(JSON.stringify({requestedMethod:'WORLD_VISA',initialized:true,redirectHost:parsed.hostname,providers:payload.data.providers?.map(p=>p.shortcode)},null,2))
