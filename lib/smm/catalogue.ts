export async function collectCataloguePages<T>(fetchPage:(start:number,end:number)=>Promise<T[]>,pageSize=1000,maxPages=30):Promise<T[]>{
 const rows:T[]=[]
 for(let page=0;page<maxPages;page++){
  const batch=await fetchPage(page*pageSize,(page+1)*pageSize-1)
  rows.push(...batch)
  if(batch.length<pageSize)return rows
 }
 throw new Error('Catalogue exceeds the safe pagination limit; do not serve an incomplete catalogue.')
}
const platforms:[string,RegExp][]=[
 ['Instagram',/instagram|\binsta\b/i],['TikTok',/tik[\s-]?tok|douyin/i],['Facebook',/facebook|\bmeta\b/i],['YouTube',/youtube|you tube/i],['Telegram',/telegram/i],['X / Twitter',/twitter|\bx\.com\b/i],['WhatsApp',/whats[\s-]?app/i],['Snapchat',/snapchat/i],['Spotify',/spotify/i],['Twitch',/twitch/i],['Discord',/discord/i],['LinkedIn',/linkedin/i],['Pinterest',/pinterest/i],['Reddit',/reddit/i],['Threads',/threads/i],['Apple Music',/apple music/i],['Audiomack',/audiomack/i],['SoundCloud',/soundcloud/i],['Boomplay',/boomplay/i],['Bluesky',/bluesky/i],['Kick',/\bkick\b/i],['Website traffic / SEO',/website|backlink|\bseo\b/i],
]
export function smmPlatform(service:{category:string;name:string}){
 // Prefer the supplier category over mentions of other networks in a description.
 for(const text of [service.category,service.name])for(const [label,pattern] of platforms)if(pattern.test(text))return label
 return 'Other services'
}
const preferred=['Instagram','TikTok','Facebook','YouTube','Telegram','X / Twitter','WhatsApp']
export function sortSmmPlatforms(values:string[]){
 return [...new Set(values)].sort((a,b)=>{const ai=preferred.indexOf(a),bi=preferred.indexOf(b);return (ai<0?100:ai)-(bi<0?100:bi)||a.localeCompare(b)})
}
