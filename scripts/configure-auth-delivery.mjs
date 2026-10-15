// Read current settings by default. --apply configures the existing Resend
// sender and merges exact app callback URLs. No confirmation requirement is
// disabled and no message is sent. Never print management/SMTP credentials.
const token = process.env.SUPABASE_ACCESS_TOKEN
if(!token)throw new Error('Add SUPABASE_ACCESS_TOKEN privately to .env; a service-role key cannot manage Auth configuration.')
const project = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname.split('.')[0]
const endpoint = 'https://api.supabase.com/v1/projects/'+encodeURIComponent(project)+'/config/auth'
const headers = {Authorization:'Bearer '+token,'Content-Type':'application/json'}
const response = await fetch(endpoint,{headers,signal:AbortSignal.timeout(20000)})
if(!response.ok)throw new Error('Auth configuration is unavailable (HTTP '+response.status+'). Check token project permissions.')
const current = await response.json()
const summarize = c => ({signupEnabled:!c.disable_signup,emailEnabled:c.external_email_enabled,emailConfirmationRequired:!c.mailer_autoconfirm,customSmtpConfigured:Boolean(c.smtp_host),smtpHost:c.smtp_host||null,siteUrl:c.site_url,appCallbackAllowed:String(c.uri_allow_list||'').includes('premiumverify://auth/callback'),httpsAppBridgeAllowed:String(c.uri_allow_list||'').includes('https://premiumverific.com/auth/mobile-callback')})
console.log('Current Auth settings:',JSON.stringify(summarize(current)))
if(process.argv.includes('--apply')){
 const apiKey=process.env.RESEND_API_KEY
 const sender=process.env.RESEND_FROM_EMAIL?.match(/(?:<)?([^<>\s]+@[^<>\s]+)(?:>)?$/)?.[1]
 if(!apiKey||apiKey==='[SENSITIVE]'||!sender||!sender.endsWith('@premiumverific.com'))throw new Error('Existing production Resend key and verified premiumverific.com sender are required.')
 if(current.smtp_host && current.smtp_host!=='smtp.resend.com')throw new Error('A different custom SMTP provider is already configured; do not overwrite it without review.')
 const existing=Array.isArray(current.uri_allow_list)?current.uri_allow_list:String(current.uri_allow_list||'').split(',').filter(Boolean)
 const allow=[...new Set([...existing,'https://premiumverific.com/auth/callback*','https://premiumverific.com/auth/mobile-callback*','premiumverify://auth/callback'])]
 // The Management API schema requires the port to be a string, even though it
 // represents a number. Sending a numeric value makes the whole update fail.
 const patch={disable_signup:false,external_email_enabled:true,mailer_autoconfirm:false,smtp_host:'smtp.resend.com',smtp_port:'465',smtp_user:'resend',smtp_pass:apiKey,smtp_admin_email:sender,smtp_sender_name:'premiumverific',site_url:'https://premiumverific.com',uri_allow_list:allow.join(',')}
 const updated=await fetch(endpoint,{method:'PATCH',headers,body:JSON.stringify(patch),signal:AbortSignal.timeout(20000)})
 if(!updated.ok)throw new Error('Auth configuration update failed (HTTP '+updated.status+').')
 console.log('Updated Auth settings:',JSON.stringify(summarize(await updated.json())))
}
