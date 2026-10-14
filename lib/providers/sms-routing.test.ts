import {test} from 'node:test'
import assert from 'node:assert/strict'
import {eligibleSmsOffers,grossMargin,type SmsOffer} from './sms-routing'
import {beanSmsRequest,readBeanSmsOrder,BeanSmsError} from './beansms'
const now=Date.parse('2026-10-14T12:00:00Z')
const offer:SmsOffer={provider:'fivesim',service:'wa',country:'US',supplierService:'whatsapp',supplierCountry:'usa',costUsd:0.2,available:10,verifiedAt:new Date(now-1000).toISOString(),enabled:true}
test('one canonical product excludes disabled, stale, invalid and unrelated supplier offers',()=>{
 const offers=[offer,{...offer,provider:'beansms' as const,costUsd:0.1},{...offer,enabled:false,costUsd:0.01},{...offer,verifiedAt:new Date(now-61000).toISOString()},{...offer,country:'NG'},{...offer,costUsd:NaN},{...offer,available:0}]
 assert.deepEqual(eligibleSmsOffers(offers,'wa','US',now).map(row=>row.provider),['beansms','fivesim'])
 assert.equal(eligibleSmsOffers(offers,'wa','US',now+120000).length,0)
 assert.ok(Math.abs(grossMargin(306,100).grossMarginPercent-67.32026)<0.001)
})
test('BeanSMS credentials stay in headers and uncertain POST outcomes are not retried',async()=>{
 const previousFetch=globalThis.fetch,previousKey=process.env.BEANSMS_API_KEY,previousSecret=process.env.BEANSMS_API_SECRET
 process.env.BEANSMS_API_KEY='test-key';process.env.BEANSMS_API_SECRET='test-secret';let calls=0
 try {
  globalThis.fetch=async(input,init)=>{calls++;assert.ok(String(input).startsWith('https://api.beansms.com/api/v1/'));assert.equal((init?.headers as Record<string,string>)['x-api-key'],'test-key');assert.equal(init?.redirect,'error');return Response.json({status:'received',smsCode:'123456'})}
  assert.deepEqual(await readBeanSmsOrder('valid-id'),{status:'received',code:'123456'})
  globalThis.fetch=async()=>{calls++;throw new Error('network failed with sensitive detail')}
  const before=calls
  await assert.rejects(()=>beanSmsRequest('/order','POST',{service:'wa',country:12}),(error:unknown)=>error instanceof BeanSmsError&&error.uncertain&&!error.message.includes('sensitive'))
  assert.equal(calls,before+1)
  await assert.rejects(()=>readBeanSmsOrder('../other'),/Invalid/)
 }finally{globalThis.fetch=previousFetch;if(previousKey===undefined)delete process.env.BEANSMS_API_KEY;else process.env.BEANSMS_API_KEY=previousKey;if(previousSecret===undefined)delete process.env.BEANSMS_API_SECRET;else process.env.BEANSMS_API_SECRET=previousSecret}
})
