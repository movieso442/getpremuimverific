// Local mocked browser checks: no actual payments or customer emails.
import assert from 'node:assert/strict'
import { pathToFileURL } from 'node:url'
const { chromium } = await import(pathToFileURL(process.argv[2]).href)
const browser = await chromium.launch({ channel: 'chrome', headless: true })
try {
  for (const width of [390,1440]) {
    const page = await browser.newPage({ viewport: { width,height: 844 } })
    const events = []
    let paymentRequests = 0
    await page.addInitScript(() => localStorage.setItem('premiumverific_profile',JSON.stringify({ id:'test-profile',user_id:'',email:'test@example.invalid',full_name:'Test',balance_xaf:0,currency:'XAF' })))
    await page.route('**/rest/v1/**',route => route.fulfill({json:[]}))
    await page.route('**/api/**',route => {
      const path = new URL(route.request().url()).pathname
      if (path==='/api/customer/checkout') { events.push(route.request().postDataJSON()); return route.fulfill({json:{success:true}}) }
      if (path==='/api/payments/manual-crypto') return route.fulfill({json:{claims:[]}})
      if (path==='/api/payments/payunit') { if(route.request().method()==='POST') { paymentRequests++; return route.fulfill({status:202,json:{reference:'PV'+'a'.repeat(32),status:'pending'}}) } return route.fulfill({json:{status:'pending',amount_xaf:5000,service_fee_xaf:0}}) }
      return route.fulfill({json:{}})
    })
    await page.goto('http://localhost:3100/add-funds',{waitUntil:'networkidle'})
    await page.getByRole('button',{name:'MTN MoMo Approve on your phone',exact:true}).click()
    await page.getByRole('button',{name:'Cancel top-up',exact:true}).click()
    await page.waitForURL('http://localhost:3100/')
    await page.waitForLoadState('networkidle')
    assert.equal(paymentRequests,0)
    assert.equal(events[0].state,'started'); assert.equal(events[1].state,'cancelled'); assert.equal(events[0].id,events[1].id)
    await page.goto('http://localhost:3100/add-funds',{waitUntil:'networkidle'})
    await page.getByRole('button',{name:'Orange Money Approve on your phone',exact:true}).click()
    await page.getByRole('button',{name:'Continue',exact:true}).click()
    await page.getByLabel('Your mobile-money number').fill('677034736')
    await page.getByRole('button',{name:'Pay 5,000 XAF',exact:true}).click()
    await page.getByRole('button',{name:'Waiting for phone approval'}).waitFor()
    page.once('dialog',async dialog => { assert.match(dialog.message(),/cannot stop or reverse/); await dialog.accept() })
    await page.getByRole('button',{name:'Leave checkout',exact:true}).click()
    await page.waitForURL('http://localhost:3100/')
    await page.waitForLoadState('networkidle')
    assert.equal(paymentRequests,1,'Leaving never sends another charge or a fake provider cancellation')
    assert.equal(events.at(-1).state,'cancelled')
    await page.goto('http://localhost:3100/email-preferences?token='+'a'.repeat(64),{waitUntil:'networkidle'})
    await page.getByRole('button',{name:'Stop checkout help emails'}).waitFor()
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth<=innerWidth),true)
    console.log(`PASS ${width}px: cancelled checkout tracked, submitted payment remains tracked without duplicate charge, opt-out requires deliberate action`)
    await page.close()
  }
} finally { await browser.close() }
