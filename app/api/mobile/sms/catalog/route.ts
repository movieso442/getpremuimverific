import { NextResponse } from 'next/server'
// These are the selections supported by the purchase endpoint. Prices and
// stock are fetched at quote/checkout, never copied from a static price list.
export function GET() {
  return NextResponse.json({
    countries: [{code:'US',name:'United States'},{code:'GB',name:'United Kingdom'},{code:'CA',name:'Canada'},{code:'AU',name:'Australia'},{code:'BR',name:'Brazil'},{code:'MX',name:'Mexico'},{code:'ES',name:'Spain'},{code:'TH',name:'Thailand'},{code:'CM',name:'Cameroon'},{code:'NG',name:'Nigeria'},{code:'FR',name:'France'},{code:'DE',name:'Germany'},{code:'ZA',name:'South Africa'}],
    services: [{code:'wa',name:'WhatsApp'},{code:'tg',name:'Telegram'},{code:'go',name:'Google'},{code:'tt',name:'TikTok'},{code:'ig',name:'Instagram'},{code:'fb',name:'Facebook'},{code:'oa',name:'OpenAI'},{code:'nf',name:'Netflix'},{code:'pp',name:'PayPal'},{code:'ds',name:'Discord'},{code:'tw',name:'X / Twitter'},{code:'td',name:'Tinder'}],
  })
}
