// Read-only Auth diagnostics. Never prints tokens, passwords or other users.
import {createClient} from '@supabase/supabase-js'
import {createHash} from 'node:crypto'
const url=process.env.NEXT_PUBLIC_SUPABASE_URL,anon=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const admin=createClient(url,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}})
const response=await fetch(url+'/auth/v1/settings',{headers:{apikey:anon},signal:AbortSignal.timeout(15000)})
const settings=await response.json()
console.log(JSON.stringify({publicSettingsHttp:response.status,emailEnabled:settings.external?.email,googleEnabled:settings.external?.google,signupDisabled:settings.disable_signup,emailAutoConfirm:settings.mailer_autoconfirm},null,2))
const listed=await admin.auth.admin.listUsers({page:1,perPage:1000})
if(listed.error)throw new Error('User diagnostic unavailable: '+listed.error.code)
const existing=listed.data.users.find(u=>u.email?.toLowerCase()==='nurdines20@gmail.com')
console.log(JSON.stringify({reportedAddressAlreadyRegistered:Boolean(existing),emailConfirmed:Boolean(existing?.email_confirmed_at),providers:existing?.app_metadata.providers,confirmationPreviouslySent:Boolean(existing?.confirmation_sent_at)},null,2))
for(const redirect of ['premiumverify://auth/callback','https://premiumverific.com/auth/mobile-callback?app_state=11111111-1111-4111-8111-111111111111']){
 const authorize=new URL(url+'/auth/v1/authorize')
 authorize.search=new URLSearchParams({provider:'google',redirect_to:redirect,code_challenge:createHash('sha256').update('diagnostic-nonlogin-verifier').digest('base64url'),code_challenge_method:'s256'}).toString()
 const result=await fetch(authorize,{redirect:'manual',signal:AbortSignal.timeout(15000)})
 const location=result.headers.get('location')
 let hints={}
 if(location){
  const state=new URL(location).searchParams.get('state')
  if(state?.split('.').length===3){
   try{const claims=JSON.parse(Buffer.from(state.split('.')[1],'base64url'));hints={stateKeys:Object.keys(claims),redirectAccepted:claims.referrer===redirect||claims.redirect_to===redirect,referrerIsWebsite:typeof claims.referrer==='string'&&claims.referrer.startsWith('https://premiumverific.com')}}catch{}
  }
 }
 console.log(JSON.stringify({flow:redirect.startsWith('premiumverify:')?'native-direct':'native-https-bridge',authorizeHttp:result.status,providerHost:location?new URL(location).hostname:null,...hints}))
}
