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
  const mode = process.env.PAYUNIT_MODE === 'sandbox' ? 'sandbox' : 'live'
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
    baseUrl: mode === 'live' ? 'https://gateway.payunit.net' : 'https://sandbox.payunit.net',
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
  return typeof payload.message === 'string' && payload.message.trim()
    ? payload.message.trim()
    : 'Payunit could not initialize the payment. Please try again shortly.'
}
