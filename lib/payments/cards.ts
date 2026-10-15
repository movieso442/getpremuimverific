export const CARD_MIN_XAF=3000, CARD_MAX_XAF=100000
export function cardAmount(value:unknown):value is number{return typeof value==='number'&&Number.isInteger(value)&&value>=CARD_MIN_XAF&&value<=CARD_MAX_XAF}
export const cardReference=(value:unknown):value is string=>typeof value==='string'&&/^PC[a-f0-9]{17}$/.test(value)
export function hostedCardUrl(value:unknown,checkoutId?:unknown){
 if(typeof value!=='string')return null
 try{const u=new URL(value);const id=u.pathname.slice(1);if(u.protocol!=='https:'||u.hostname!=='checkout.payunit.net'||u.port||u.username||u.password||u.search||u.hash||!/^PU_LIVE_[a-f0-9-]{36}$/i.test(id)||(checkoutId!==undefined&&id!==checkoutId))return null;return {url:u.href,checkoutId:id}}catch{return null}
}
export type CardProof={checkoutId:string;reference:string;amount:number;currency:'XAF';mode:'LIVE';status:'SUCCESS'|'FAILED'|'CANCELLED'|'PENDING'}
export function cardProof(payload:unknown,expected:{checkoutId:string;reference:string;amount:number}):CardProof|null{
 if(!payload||typeof payload!=='object')return null
 const p=payload as {status?:string;data?:{checkout_id?:unknown;transaction_id?:unknown;total_amount?:unknown;currency?:unknown;checkout_mode?:unknown;status?:unknown}}
 const d=p.data
 if(p.status!=='SUCCESS'||!d||d.checkout_id!==expected.checkoutId||d.transaction_id!==expected.reference||Number(d.total_amount)!==expected.amount||d.currency!=='XAF'||d.checkout_mode!=='LIVE'||!['SUCCESS','FAILED','CANCELLED','PENDING','INITIATED'].includes(String(d.status)))return null
 return {checkoutId:expected.checkoutId,reference:expected.reference,amount:expected.amount,currency:'XAF',mode:'LIVE',status:d.status==='INITIATED'?'PENDING':d.status as CardProof['status']}
}
