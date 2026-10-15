// Local UI only: Supabase and payment responses are mocked, no emails/charges.
import assert from 'node:assert/strict'
import {pathToFileURL} from 'node:url'
const {chromium}=await import(pathToFileURL(process.argv[2]).href)
const browser=await chromium.launch({channel:'chrome',headless:true})
const origin=process.argv[3]||'http://localhost:3100'
try{
 for(const width of [320,390,1440]){
  const page=await browser.newPage({viewport:{width,height:900}})
  let signup=0
  await page.addInitScript(()=>localStorage.setItem('premiumverific_profile',JSON.stringify({id:'test-wallet',user_id:'',email:'test@example.invalid',full_name:'Local test',balance_xaf:0,currency:'XAF',role:'client'})))
  await page.route('**/rest/v1/**',r=>r.fulfill({json:[]}))
  await page.route('**/auth/v1/**',async r=>{
   if(new URL(r.request().url()).pathname.endsWith('/signup')){
    signup++;const body=r.request().postDataJSON();assert.equal(body.email,'new-user@example.invalid')
    assert.ok(r.request().url().includes('redirect_to='))
    return r.fulfill({json:{id:'test-user',email:body.email,identities:[],user_metadata:{}}})
   }
   return r.fulfill({status:401,json:{message:'No test session'}})
  })
  await page.route('**/api/**',r=>r.fulfill({json:{claims:[],pending_mobile:null}}))
  await page.goto(origin+'/add-funds',{waitUntil:'networkidle'})
  await page.getByRole('heading',{name:'How would you like to pay?'}).waitFor()
  assert.equal(await page.getByRole('button',{name:/card|1\.4%/i}).count(),0)
  assert.ok(await page.getByRole('button',{name:/MTN MoMo/}).count())
  await page.goto(origin+'/signup',{waitUntil:'networkidle'})
  await page.getByPlaceholder('Username',{exact:true}).fill('new-user')
  await page.getByPlaceholder('Email Address',{exact:true}).fill('new-user@example.invalid')
  await page.getByPlaceholder('Password',{exact:true}).fill('Local-test-password-123')
  await page.getByPlaceholder('Confirm password',{exact:true}).fill('Local-test-password-123')
  await page.getByLabel(/I have read and agreed/).check()
  await page.getByRole('button',{name:'Sign up',exact:true}).click()
  await page.getByRole('status').filter({hasText:'Signup request accepted'}).waitFor()
  assert.equal(signup,1)
  assert.equal(await page.getByText('Check your email to confirm your account, then sign in to continue.',{exact:true}).count(),0)
  const preview=await page.evaluate(()=>JSON.parse(localStorage.getItem('premiumverific_profile')||'{}'))
  assert.notEqual(preview.id,'test-user','Unconfirmed signup must not create a signed-in preview')
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true)
  await page.goto(origin+'/auth/mobile-callback?code=test-code&app_state=11111111-1111-4111-8111-111111111111',{waitUntil:'networkidle'})
  const link=page.getByRole('link',{name:'Open premiumverific app',exact:true})
  await link.waitFor()
  assert.equal(await link.getAttribute('href'),'premiumverify://auth/callback?code=test-code&app_state=11111111-1111-4111-8111-111111111111')
  assert.ok(!page.url().includes('code='))
  await page.screenshot({path:process.env.TEMP+`/premiumverific-auth-return-${width}.png`,fullPage:true})
  await page.close()
 }
 console.log('PASS responsive auth/wallet: no card option, real signup request, truthful existing-account notice, no unconfirmed preview, and fixed app callback link with history stripping.')
}finally{await browser.close()}
