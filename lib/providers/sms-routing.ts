export type SmsProviderId='fivesim'|'beansms'
export type SmsOffer={provider:SmsProviderId;service:string;country:string;supplierService:string;supplierCountry:string;costUsd:number;available:number;verifiedAt:string;enabled:boolean}
/** One customer product, multiple private supplier offers. No fuzzy ID matching. */
export function eligibleSmsOffers(offers:SmsOffer[],service:string,country:string,now=Date.now()) {
  return offers.filter(offer=>offer.enabled && offer.service===service && offer.country===country && Number.isFinite(offer.costUsd) && offer.costUsd>0 && offer.available>0 && now-Date.parse(offer.verifiedAt)>=0 && now-Date.parse(offer.verifiedAt)<=60000)
    .sort((a,b)=>a.costUsd-b.costUsd || a.provider.localeCompare(b.provider))
}
export function grossMargin(saleXaf:number,costXaf:number) {
  if(!Number.isFinite(saleXaf)||saleXaf<=0||!Number.isFinite(costXaf)||costXaf<0)throw new Error('Invalid margin inputs.')
  return {grossProfitXaf:saleXaf-costXaf,grossMarginPercent:100*(saleXaf-costXaf)/saleXaf}
}
