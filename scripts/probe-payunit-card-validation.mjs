// Negative validation only, against the existing unpaid probe. Never use card
// numbers (real OR test) with live credentials. This sends no card information.
import {readFile} from 'node:fs/promises'
import {getPayunitConfig} from '../lib/payments/payunit.ts'
if(!process.argv.includes('--validate-unpaid-draft'))throw new Error('Explicit unpaid-draft validation flag required.')
const probe=JSON.parse(await readFile('.vercel/card-capability-probe.json','utf8'))
const config=getPayunitConfig()
if(!config||config.mode!=='live')throw new Error('Live credentials required.')
const response=await fetch(config.baseUrl+'/api/gateway/checkout/process',{method:'POST',headers:config.headers,redirect:'error',signal:AbortSignal.timeout(20000),body:JSON.stringify({
 checkout_id:probe.checkoutId,customer:{email:'integration-check@example.invalid',country:'CM',name:'Integration capability check'},shipping:{payment_method:'WORLD_VISA',payment_info:{}},
})})
const result=await response.json().catch(()=>null)
console.log(JSON.stringify({http:response.status,status:result?.status,message:result?.message,errors:result?.errors,dataKeys:result?.data&&typeof result.data==='object'?Object.keys(result.data):undefined,noCardDataSubmitted:true},null,2))
