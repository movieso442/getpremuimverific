// Manual capability probe: one unpaid checkout, no customer ledger or card data.
import { randomUUID } from 'node:crypto'
import { writeFile, mkdir } from 'node:fs/promises'
import { getPayunitConfig } from '../lib/payments/payunit.ts'
import { hostedCardUrl } from '../lib/payments/cards.ts'
if(!process.argv.includes('--create-unpaid-probe'))throw new Error('Explicit unpaid probe flag required.')
const config=getPayunitConfig()
if(!config||config.mode!=='live')throw new Error('Live credentials required.')
const reference='PX'+randomUUID().replaceAll('-','').slice(0,17)
const response=await fetch(config.baseUrl+'/api/gateway/checkout/initialize',{method:'POST',headers:config.headers,redirect:'error',signal:AbortSignal.timeout(20000),body:JSON.stringify({
  total_amount:3042,currency:'XAF',transaction_id:reference,mode:'payment',success_url:config.appUrl+'/payments/card-return',cancel_url:config.appUrl+'/payments/card-return',notify_url:config.appUrl+'/api/payments/webhooks/payunit-card',
  items:[{price_description:{unit_amount:3042},product_description:{name:'Integration capability check - DO NOT PAY',image_url:config.appUrl+'/brand/icon-512.png',about_product:'Unpaid capability check; no order or wallet credit.'},quantity:1}],meta:{phone_number_collection:false,address_collection:true},
})})
const payload=await response.json().catch(()=>null)
const checkout=payload?.status==='SUCCESS'?hostedCardUrl(payload.data?.redirect,payload.data?.checkout_id):null
if(!response.ok||!checkout)throw new Error('Checkout initialization failed: HTTP '+response.status)
await mkdir('.vercel',{recursive:true})
await writeFile('.vercel/card-capability-probe.json',JSON.stringify({...checkout,reference},null,2))
const statusResponse=await fetch(config.baseUrl+'/api/gateway/checkout/status/'+encodeURIComponent(checkout.checkoutId),{headers:config.headers,redirect:'error',signal:AbortSignal.timeout(20000)})
const status=await statusResponse.json().catch(()=>null)
const page=await fetch(checkout.url,{signal:AbortSignal.timeout(20000)})
const html=await page.text()
await writeFile('.vercel/card-capability-page.html',html)
console.log(JSON.stringify({initialized:true,checkoutHost:new URL(checkout.url).hostname,referenceMatches:status?.data?.transaction_id===reference,statusHttp:statusResponse.status,checkoutStatus:status?.data?.status,mode:status?.data?.checkout_mode,currency:status?.data?.currency,amount:status?.data?.total_amount,pageHttp:page.status,pageTitle:html.match(/<title>(.*?)<\/title>/)?.[1],scripts:[...html.matchAll(/<script[^>]*src="([^"]+)"/g)].map(m=>m[1]),cardTextMatches:html.match(/.{0,45}(visa|mastercard|credit card|WORLD_VISA).{0,80}/gi)?.slice(0,12)},null,2))
