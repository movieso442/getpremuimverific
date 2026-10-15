// Local responsive checks. Payment APIs and account data are mocked; no money moves.
import assert from 'node:assert/strict'
import { pathToFileURL } from 'node:url'
const { chromium } = await import(pathToFileURL(process.argv[2]).href)
const browser = await chromium.launch({ channel: 'chrome', headless: true })
try {
  for (const width of [320,390,768,1440]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } })
    let posted = 0, pending = false
    const reference = 'PC123456789abcdef12'
    await page.addInitScript(() => localStorage.setItem('premiumverific_profile',JSON.stringify({id:'card-ui-test',user_id:'',email:'test@example.invalid',full_name:'Local UI test',balance_xaf:0,currency:'XAF',role:'client'})))
    await page.route('**/rest/v1/**',route=>route.fulfill({json:[]}))
    await page.route('**/api/**',async route=>{
      const path = new URL(route.request().url()).pathname
      if(path==='/api/payments/cards') {
        if(route.request().method()==='POST') {
          posted++; const body=route.request().postDataJSON()
          assert.equal(body.amount,5000); assert.equal(body.accepted_fee_percent,1.4)
          assert.ok(body.idempotency_key); assert.equal(body.card_number,undefined); assert.equal(body.cvv,undefined)
          pending=true
          return route.fulfill({status:202,json:{reference,status:'pending',uncertain:true,message:'Checkout creation needs checking. Do not pay again.'}})
        }
        return route.fulfill({json:{available:true,payment:pending?{reference,amount:5000,service_fee_xaf:70,status:'pending',checkout_url:null,expires_at:null}:null}})
      }
      if(path==='/api/payments/manual-crypto')return route.fulfill({json:{claims:[],pending_mobile:pending?{reference,amount:5000,payment_method:'payunit_card'}:null}})
      return route.fulfill({json:{}})
    })
    await page.goto('http://localhost:3100/add-funds',{waitUntil:'networkidle'})
    await page.getByRole('button',{name:/Credit or debit card Secure/}).click()
    await page.getByLabel('Amount to add to your wallet (XAF)').fill('100001')
    assert.equal(await page.getByRole('button',{name:'Continue',exact:true}).isDisabled(),true)
    await page.getByLabel('Amount to add to your wallet (XAF)').fill('5000')
    await page.getByRole('button',{name:'Continue',exact:true}).click()
    const pay=page.getByRole('button',{name:/Pay 5,070 XAF securely/})
    await pay.waitFor()
    await page.getByText('70 XAF',{exact:true}).waitFor()
    assert.equal(await page.locator('input[autocomplete="cc-number"],input[autocomplete="cc-csc"]').count(),0)
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true)
    await page.screenshot({path:`${process.env.TEMP}/premium-verific-card-${width}.png`,fullPage:true})
    await pay.click(); await page.getByText('Checkout creation needs checking. Do not pay again.').waitFor()
    assert.equal(posted,1)
    assert.equal(await page.getByRole('button',{name:/Pay 5,070 XAF securely/}).count(),0)
    await page.reload({waitUntil:'networkidle'})
    await page.getByText('Payment reference: '+reference,{exact:true}).waitFor()
    assert.equal(posted,1)
    await page.goto('http://localhost:3100/payments/card-return')
    await page.getByRole('heading',{name:'Let’s check your payment'}).waitFor()
    await page.getByRole('link',{name:'Return to my wallet'}).waitFor()
    await page.close()
  }
  console.log('PASS card UI: 320–1440px, 1.4% fee/total, amount cap, no raw-card fields, uncertain checkout recovery without duplicate POST, return screen.')
} finally { await browser.close() }
