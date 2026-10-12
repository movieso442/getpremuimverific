// Optional local UI smoke test. Requires Playwright and installed Chrome.
// Payment and telemetry requests are mocked: no real charge or email is sent.
import assert from 'node:assert/strict'
import { pathToFileURL } from 'node:url'
const { chromium } = await import(process.argv[2] ? pathToFileURL(process.argv[2]).href : 'playwright')
const browser = await chromium.launch({ channel: 'chrome', headless: true })
try {
  for (const width of [360, 390, 768]) {
    const page = await browser.newPage({ viewport: { width, height: 844 } })
    await page.route('**/api/analytics/event', route => route.fulfill({ status: 202, json: { recorded: false } }))
    await page.goto('http://localhost:3100/add-funds', { waitUntil: 'domcontentloaded' })
    await page.getByRole('heading', { name: 'Add funds', exact: true }).waitFor()
    await page.getByRole('button', { name: 'MTN MoMo', exact: true }).waitFor()
    assert.equal(await page.getByText(/Continue to Payunit|hosted checkout/i).count(), 0)
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'No horizontal overflow at ' + width)
    if (width < 768) {
      const main = page.locator('main').first()
      const before = await main.boundingBox()
      await page.getByRole('button', { name: 'Open navigation', exact: true }).click()
      const dialog = page.getByRole('dialog', { name: 'Navigation' })
      await dialog.waitFor()
      const after = await main.boundingBox()
      assert.equal(after.width, before.width, 'Drawer does not squeeze page')
      await page.keyboard.press('Escape')
      await dialog.waitFor({ state: 'detached' })
      await page.getByRole('button', { name: 'Open navigation', exact: true }).click()
      await page.getByRole('dialog', { name: 'Navigation' }).getByRole('link', { name: 'Add Funds', exact: true }).click()
      await dialog.waitFor({ state: 'detached' })
    }
    console.log('Checkout and navigation verified at ' + width + 'px')
    await page.close()
  }
  for (const width of [320, 360, 390, 768, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 844 } })
    await page.route('**/api/analytics/event', route => route.fulfill({ status: 202, json: { recorded: false } }))
    await page.goto('http://localhost:3100/downloads', { waitUntil: 'domcontentloaded' })
    await page.getByRole('heading', { name: 'Choose your phone' }).waitFor()
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'Downloads fit ' + width)
    assert.equal(await page.getByRole('button', { name: 'Android download not available yet' }).isDisabled(), true)
    assert.equal(await page.getByRole('link', { name: 'Use website on iPhone' }).getAttribute('href'), '/sms-verification')
    assert.equal(await page.getByRole('link', { name: /Download Android APK|Join iPhone beta/ }).count(), 0)
    await page.getByRole('link', { name: 'Open web panel' }).click()
    await page.waitForURL('**/sms-verification')
    console.log('Downloads fit ' + width + 'px, no fake releases, web fallback works')
    await page.close()
  }
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
  await page.route('**/api/analytics/event', route => route.fulfill({ status: 202, json: { recorded: false } }))
  let submissions = 0, sent, completed = false
  await page.route('**/api/payments/payunit**', async route => {
    if (route.request().method() === 'POST') {
      submissions++; sent = route.request().postDataJSON()
      await route.fulfill({ status: 202, json: { reference: 'PV-test-ui', status: 'pending', credited: false } })
    } else await route.fulfill({ json: { status: completed ? 'completed' : 'pending', credited: completed } })
  })
  await page.goto('http://localhost:3100/add-funds', { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: 'Orange Money', exact: true }).click()
  await page.getByLabel('Your mobile-money number').fill('690000000')
  await page.getByRole('button', { name: 'Pay 5,000 XAF', exact: true }).click()
  await page.getByRole('button', { name: 'Waiting for phone approval' }).waitFor()
  assert.equal(submissions, 1)
  assert.equal(sent.payment_method, 'orange_money')
  assert.equal(sent.phone_number, '690000000')
  assert.equal(sent.amount, 5000)
  assert.equal(await page.getByRole('button', { name: 'Waiting for phone approval' }).isDisabled(), true)
  completed = true
  await page.getByRole('button', { name: 'Wallet credited' }).waitFor({ timeout: 15000 })
  assert.ok(page.url().startsWith('http://localhost:3100/add-funds'))
  console.log('Mocked Orange payment stays on branded checkout and waits for verified completion')
  await page.close()
} finally { await browser.close() }
