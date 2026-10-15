// Keep the existing confirmation link for website customers, and add a code
// for native customers. This command never prints tokens or email HTML.
const token = process.env.SUPABASE_ACCESS_TOKEN
const project = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname.split('.')[0]
if (!token) throw new Error('SUPABASE_ACCESS_TOKEN is required locally.')
const endpoint = `https://api.supabase.com/v1/projects/${encodeURIComponent(project)}/config/auth`
const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
const currentResponse = await fetch(endpoint, { headers, signal: AbortSignal.timeout(20000) })
if (!currentResponse.ok) throw new Error(`Could not read Auth configuration (${currentResponse.status}).`)
const current = await currentResponse.json()
const oldTemplate = current.mailer_templates_confirmation_content
if (typeof oldTemplate !== 'string' || !oldTemplate.includes('{{ .ConfirmationURL }}')) throw new Error('Confirmation template needs review before adding the app code.')
const codeSnippet = '<p>Using the premiumverific Android app? Enter this six-digit confirmation code in the app: <strong>{{ .Token }}</strong></p>'
const nextTemplate = oldTemplate.includes('{{ .Token }}') ? oldTemplate : oldTemplate.includes('</body>')
  ? oldTemplate.replace('</body>', `${codeSnippet}</body>`)
  : `${oldTemplate}\n${codeSnippet}`
const existing = String(current.uri_allow_list || '').split(',').map(value => value.trim()).filter(Boolean)
const allow = [...new Set([...existing, 'premiumverify://auth/callback*', 'https://premiumverific.com/auth/mobile-callback*'])]
console.log(JSON.stringify({ confirmationCodeAvailable: oldTemplate.includes('{{ .Token }}'), directAppCallbackAllowed: existing.includes('premiumverify://auth/callback*'), websiteCallbackPreserved: oldTemplate.includes('{{ .ConfirmationURL }}') }))
if (process.argv.includes('--apply')) {
  const response = await fetch(endpoint, { method: 'PATCH', headers, body: JSON.stringify({ mailer_templates_confirmation_content: nextTemplate, uri_allow_list: allow.join(',') }), signal: AbortSignal.timeout(20000) })
  if (!response.ok) throw new Error(`Auth configuration update failed (${response.status}).`)
  const updated = await response.json()
  if (!String(updated.mailer_templates_confirmation_content || '').includes('{{ .Token }}') || !String(updated.uri_allow_list || '').includes('premiumverify://auth/callback*')) throw new Error('Auth configuration response did not confirm app code and callback. Re-read settings before testing.')
  console.log('Native signup code and direct app callback enabled; website confirmation link retained.')
}
