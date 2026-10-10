import { test } from 'node:test'
import assert from 'node:assert/strict'
import { NextRequest } from 'next/server'
import { unstable_doesMiddlewareMatch } from 'next/experimental/testing/server'
import { config, proxy } from '../../proxy'

test('admin hostname opens its own login without moving to the customer domain', () => {
  for (const path of ['/', '/login', '/signup']) {
    const request = new NextRequest(`https://admin.premiumverific.com${path}`, { headers: { host: 'admin.premiumverific.com' } })
    assert.equal(proxy(request).headers.get('location'), 'https://admin.premiumverific.com/admin/login')
  }
  const customer = new NextRequest('https://premiumverific.com/login', { headers: { host: 'premiumverific.com' } })
  assert.equal(proxy(customer).headers.get('location'), null)
})

test('routing leaves admin pages, OAuth callbacks, APIs, and assets untouched', () => {
  for (const url of ['/admin', '/admin/login', '/admin/auth/callback?code=test', '/api/admin/session', '/_next/static/test.js', '/favicon.ico']) {
    assert.equal(unstable_doesMiddlewareMatch({ config, nextConfig: {}, url }), false, url)
    const request = new NextRequest(`https://admin.premiumverific.com${url}`, { headers: { host: 'admin.premiumverific.com' } })
    assert.equal(proxy(request).headers.get('location'), null, url)
  }
})
