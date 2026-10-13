// Offline UI tests: no live payments, recovery requests, or customer records.
import assert from 'node:assert/strict'
import { pathToFileURL } from 'node:url'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
const { chromium } = await import(pathToFileURL(process.argv[2]).href)
const browser = await chromium.launch({ channel: 'chrome', headless: true })
try {
  for (const width of [320, 390, 768, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 844 } })
    await page.addInitScript(() => {
      if (sessionStorage.getItem('ui-test-seeded')) return
      sessionStorage.setItem('ui-test-seeded', 'yes')
      localStorage.setItem('premiumverific_profile', JSON.stringify({ id: 'test-wallet', user_id: '', email: 'test@example.invalid', full_name: 'Test Customer', phone_number: '', balance_xaf: 0, currency: 'AUTO', role: 'client' }))
    })
    await page.route('**/rest/v1/**', route => route.fulfill({ json: [] }))
    await page.route('**/api/**', route => {
      const path = new URL(route.request().url()).pathname
      if (path.startsWith('/api/admin/')) return route.fulfill({ status: 401, json: { error: 'Owner access required' } })
      if (path === '/api/display-currency') return route.fulfill({ json: { currency: 'NGN', rate: 2.5, date: '2026-10-12' } })
      if (path === '/api/v1/smm/services') return route.fulfill({ json: { services: [{ id: 123, name: 'Instagram followers test', category: 'Instagram', retail_rate_xaf: 1200, min: 100, max: 10000 }] } })
      return route.fulfill({ json: {} })
    })
    await page.goto('http://localhost:3100/profile', { waitUntil: 'networkidle' })
    await page.getByRole('button', { name: 'Save Profile Preferences' }).waitFor()
    assert.equal(await page.getByPlaceholder('Your own phone number, including country code').inputValue(), '')
    assert.equal(await page.locator('select').inputValue(), 'AUTO')
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
    if (width < 768) {
      await page.getByRole('button', { name: 'Open navigation' }).click()
      await page.getByRole('dialog', { name: 'Navigation' }).waitFor()
      if (width === 390) await page.screenshot({ path: join(tmpdir(), 'premium-verific-mobile-menu.png') })
      assert.equal(await page.getByRole('link', { name: 'Rent Number', exact: true }).count(), 0)
      assert.equal(await page.getByRole('link', { name: 'Developer API', exact: true }).count(), 0)
      await page.getByRole('link', { name: 'Facebook recovery', exact: true }).click()
      await page.getByRole('heading', { name: 'Facebook recovery' }).waitFor()
      assert.equal(await page.getByRole('dialog').count(), 0)
      await page.getByRole('button', { name: 'Continue on WhatsApp' }).waitFor()
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
    }
    await page.goto('http://localhost:3100/accounts', { waitUntil: 'networkidle' })
    await page.getByRole('heading', { name: 'Account store', exact: true }).waitFor()
    await page.getByRole('button', { name: 'Continue on WhatsApp' }).waitFor()
    await page.goto('http://localhost:3100/sms-verification', { waitUntil: 'networkidle' })
    const start = Date.now()
    await page.getByRole('button', { name: /Get virtual number/ }).click()
    await page.waitForURL('**/add-funds?**')
    assert.ok(Date.now() - start < 1400, 'No artificial 1.5 second top-up delay')
    await page.goto('http://localhost:3100/', { waitUntil: 'networkidle' })
    await page.getByLabel('Platform / category').selectOption('Instagram')
    await page.getByLabel('Service', { exact: true }).selectOption('123')
    await page.getByLabel('Quantity', { exact: true }).fill('2000')
    await page.getByText('2,400 XAF', { exact: true }).waitFor()
    await page.getByRole('link', { name: 'Open order panel', exact: true }).click()
    await page.waitForURL('**/dashboard?service=123&quantity=2000')
    await page.getByRole('button', { name: 'Sign out', exact: true }).click()
    await page.waitForURL('http://localhost:3100/')
    assert.equal(await page.evaluate(() => localStorage.getItem('premiumverific_profile')), null)
    assert.equal(await page.getByRole('dialog').count(), 0)
    await page.goto('http://localhost:3100/admin', { waitUntil: 'networkidle' })
    await page.getByLabel('Admin email', { exact: true }).waitFor()
    assert.equal(await page.getByLabel('Admin email', { exact: true }).inputValue(), 'mohammednurdine6@gmail.com')
    await page.getByRole('button', { name: 'Sign in to dashboard', exact: true }).waitFor()
    assert.equal(await page.getByText(/Dashboard preview/).count(), 0)
    assert.equal(await page.getByRole('button', { name: /Approve/ }).count(), 0)
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
    await page.close()
    console.log(`Navigation, forms, fast top-up, calculator and private admin preview passed at ${width}px`)
  }
} finally { await browser.close() }
