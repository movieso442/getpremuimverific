/** Server-side BeanSMS reseller client. Never import into client components. */
export class BeanSmsError extends Error {
  constructor(public readonly status: number, public readonly uncertain: boolean) {
    super(uncertain ? 'Supplier request outcome is uncertain. Reconcile it before retrying.' : `BeanSMS request failed (${status}).`)
  }
}
export async function beanSmsRequest(path: string, method: 'GET' | 'POST' = 'GET', body?: unknown) {
  const key=process.env.BEANSMS_API_KEY, secret=process.env.BEANSMS_API_SECRET
  if (!key || !secret) throw new Error('BeanSMS server credentials are not configured.')
  // Fixed official origin: credentials cannot be redirected to a configured URL.
  let response: Response
  try {
    response=await fetch(`https://api.beansms.com/api/v1${path}`,{
      method,redirect:'error',cache:'no-store',signal:AbortSignal.timeout(15000),
      headers:{'x-api-key':key,'x-api-secret':secret,Accept:'application/json','Content-Type':'application/json'},
      ...(body===undefined?{}:{body:JSON.stringify(body)}),
    })
  } catch { throw new BeanSmsError(0,method==='POST') }
  const data:unknown=await response.json().catch(()=>null)
  if(!response.ok || data===null) throw new BeanSmsError(response.status,method==='POST' && (response.status>=500 || response.ok))
  return data
}
export const readBeanSmsCatalogue=async()=>{
  // Sequential reads respect the published 60 requests/minute limit.
  return {balance:await beanSmsRequest('/balance'),countries:await beanSmsRequest('/countries'),services:await beanSmsRequest('/services'),prices:await beanSmsRequest('/prices')}
}
export async function readBeanSmsOrder(id:string) {
  if(!/^[a-zA-Z0-9_-]{1,120}$/.test(id))throw new Error('Invalid supplier order ID.')
  const value=await beanSmsRequest(`/order/${encodeURIComponent(id)}`)
  if(!value || typeof value!=='object')throw new Error('Invalid supplier status response.')
  const order=value as Record<string,unknown>
  if(!['waiting','received','completed','cancelled','timeout'].includes(String(order.status)))throw new Error('Unknown supplier status; manual reconciliation required.')
  return {status:String(order.status),code:typeof order.smsCode==='string'?order.smsCode:null}
}
// Purchases intentionally have no automatic retry/fallback: the API has not
// documented an idempotency key or recovery lookup for a lost POST response.
// Enable ordering only after authenticated prices/mappings and recovery are tested.
