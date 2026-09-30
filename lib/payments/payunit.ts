export type PayunitStatusResponse = {
  status?: string
  message?: string
  data?: {
    transaction_id?: string
    transaction_status?: string
    transaction_amount?: number | string
    transaction_currency?: string
    transaction_url?: string
    payment_url?: string
  }
}

export function getPayunitConfig() {
  // Payunit's API calls the sandbox header value "test". Keep accepting the
  // older "sandbox" spelling in environment files, but never send it upstream.
  const mode = ['test', 'sandbox'].includes((process.env.PAYUNIT_MODE || '').toLowerCase()) ? 'test' : 'live'
  const appId = process.env.PAYUNIT_APP_ID
  const apiUser = process.env.PAYUNIT_API_USER
  const apiPassword = process.env.PAYUNIT_API_PASSWORD
  const apiKey = mode === 'live' ? process.env.PAYUNIT_LIVE_KEY : process.env.PAYUNIT_API_KEY
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '')

  if (!appId || !apiUser || !apiPassword || !apiKey || !appUrl) return null

  return {
    appId,
    appUrl,
    mode,
    apiKey,
    baseUrl: 'https://gateway.payunit.net',
    headers: {
      'x-api-key': apiKey,
      mode,
      'Content-Type': 'application/json',
      Authorization: `Basic ${Buffer.from(`${apiUser}:${apiPassword}`).toString('base64')}`,
    },
  }
}

export async function getPayunitPaymentStatus(transactionId: string, config: NonNullable<ReturnType<typeof getPayunitConfig>>) {
  const response = await fetch(`${config.baseUrl}/api/gateway/paymentstatus/${encodeURIComponent(transactionId)}`, {
    headers: config.headers,
    signal: AbortSignal.timeout(20_000),
  })
  const payload = await response.json().catch(() => ({})) as PayunitStatusResponse
  return { response, payload }
}

export function paymentErrorMessage(payload: PayunitStatusResponse) {
  const providerMessage = typeof payload.message === 'string' ? payload.message.trim() : ''
  if (/live operating environment.*sandbox/i.test(providerMessage)) {
    return 'Payments are not live yet. Payunit must activate this application in Live mode before we can accept real payments.'
  }
  return providerMessage || 'Payunit could not initialize the payment. Please try again shortly.'
}
