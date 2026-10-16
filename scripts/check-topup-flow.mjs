// Local UI checks only: all payment requests and Supabase REST reads are mocked.
import assert from 'node:assert/strict'
import { pathToFileURL } from 'node:url'
const { chromium } = await import(pathToFileURL(process.argv[2]).href)
const browser = await chromium.launch({ channel: 'chrome', headless: true })
try {
  for (const width of [320, 390, 768, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 844 } })
    let claims = [], phoneRequests = 0, cryptoRequests = 0, receiptUploads = 0
    await page.addInitScript(() => localStorage.setItem('premiumverific_profile', JSON.stringify({ id: 'test-wallet', user_id: '', email: 'test@example.invalid', full_name: 'UI test', balance_xaf: 0, currency: 'XAF', role: 'client' })))
    await page.route('**/rest/v1/**', route => route.fulfill({ json: [] }))
    await page.route('**/api/**', async route => {
      const path = new URL(route.request().url()).pathname
      const post = route.request().method() === 'POST'
      if (path === '/api/display-currency') return route.fulfill({ json: { currency: 'USD', rate: 1 / 600, date: '2026-10-13' } })
      if (path === '/api/payments/manual-crypto/receipt') {
        assert.equal(post, true)
        receiptUploads++
        assert.ok(route.request().headers()['content-type'].includes('multipart/form-data'))
        claims = claims.map(claim => ({ ...claim, receipt_attached: true }))
        return route.fulfill({ status: 201, json: { success: true } })
      }
      if (path === '/api/payments/manual-crypto') {
        if (post) { cryptoRequests++; const body = route.request().postDataJSON(); assert.equal(body.accepted_fee_percent, 2); claims = [{ id: 'claim-test', payment_method: body.payment_method, crypto_amount: body.crypto_amount, amount_xaf: body.amount_xaf, status: 'pending' }]; return route.fulfill({ status: 201, json: { success: true, claim_id: 'claim-test' } }) }
        return route.fulfill({ json: { claims, pending_claim: claims.find(claim => claim.status === 'pending') || null, receipt_upload_available: true } })
      }
      if (path === '/api/payments/payunit') {
        if (post) { phoneRequests++; assert.equal(route.request().postDataJSON().accepted_fee_percent, 0); return route.fulfill({ status: 202, json: { reference: 'PV' + 'a'.repeat(32), status: 'pending' } }) }
        return route.fulfill({ json: { amount_xaf: 5000, service_fee_xaf: 0, status: 'pending' } })
      }
      if (path === '/api/bot/topup') return route.fulfill({ json: { amount_xaf: 5000, status: 'ready' } })
      return route.fulfill({ json: {} })
    })
    await page.goto('http://localhost:3100/add-funds', { waitUntil: 'networkidle' })
    await page.getByRole('heading', { name: 'How would you like to pay?' }).waitFor()
    assert.equal(await page.getByLabel('Amount to add to your wallet (XAF)').count(), 0)
    await page.getByRole('button', { name: 'USDT Tron (TRC20)', exact: true }).click()
    await page.getByLabel('Amount to add to your wallet (XAF)').fill('5000')
    await page.getByRole('button', { name: 'Continue', exact: true }).click()
    await page.getByRole('button', { name: 'Copy address', exact: true }).waitFor()
    await page.getByRole('heading', { name: 'Estimated USDT equivalent' }).waitFor()
    await page.getByText('≈ 8.500000 USDT', { exact: true }).waitFor()
    assert.equal(await page.getByLabel('Payment reference', { exact: true }).count(), 0)
    assert.equal(await page.getByText('Blockchain transaction hash', { exact: true }).count(), 0)
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
    await page.screenshot({ path: `${process.env.TEMP}/premium-verify-topup-${width}.png`, fullPage: true })
    await page.getByRole('button', { name: 'I’ve paid', exact: true }).click()
    await page.getByLabel('Payment reference', { exact: true }).fill('https://tronscan.org/#/transaction/' + 'b'.repeat(64))
    await page.getByLabel('Amount sent (USDT)', { exact: true }).fill('8.50')
    await page.locator('input[type=file]').setInputFiles({ name: 'test-only-receipt.png', mimeType: 'image/png', buffer: Buffer.from([137,80,78,71,13,10,26,10]) })
    await page.getByRole('button', { name: 'Find my payment', exact: true }).dblclick()
    await page.getByRole('heading', { name: 'Payment being checked' }).waitFor()
    assert.equal(cryptoRequests, 1)
    assert.equal(receiptUploads, 1)
    await page.getByRole('link', { name: 'View uploaded receipt' }).waitFor()
    await page.reload({ waitUntil: 'networkidle' })
    await page.getByRole('heading', { name: 'Payment being checked' }).waitFor()
    assert.equal(await page.getByRole('button', { name: 'I’ve paid' }).count(), 0)
    claims = [] // Simulate completed admin review before a new top-up.
    await page.goto('http://localhost:3100/add-funds')
    await page.getByRole('button', { name: 'Orange Money Approve on your phone', exact: true }).click()
    await page.getByRole('button', { name: 'Continue', exact: true }).click()
    await page.getByLabel('Your mobile-money number').fill('677034736')
    await page.getByRole('button', { name: 'Pay 5,000 XAF', exact: true }).dblclick()
    await page.getByRole('button', { name: 'Waiting for phone approval' }).waitFor()
    assert.equal(phoneRequests, 1)
    assert.equal(await page.getByRole('button', { name: 'Back', exact: true }).count(), 0)
    assert.ok((await page.getByRole('link', { name: 'Contact us on WhatsApp' }).getAttribute('href')).startsWith('https://wa.me/237640796062'))
    await page.goto('http://localhost:3100/bot-topup?token=' + 'x'.repeat(43))
    await page.getByRole('button', { name: 'MTN MoMo Approve on your phone', exact: true }).click()
    await page.getByLabel('Your mobile-money number').waitFor()
    assert.equal(await page.getByText('Manual mobile-money payment', { exact: true }).count(), 0)
    console.log(`PASS ${width}px: method-first, deferred receipt, reload, duplicate-click locks, shared bot flow`)
    await page.close()
  }
} finally { await browser.close() }
