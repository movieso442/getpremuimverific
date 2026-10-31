import { requireAdmin } from '@/lib/admin/auth'
import { beanSmsRequest } from '@/lib/providers/beansms'

export const dynamic = 'force-dynamic'

type ProviderBalance = {
  provider: '5SIM' | 'JustAnotherPanel' | 'BeanSMS'
  balance: number | null
  currency: string | null
  status: 'ok' | 'not_configured' | 'error'
  message?: string
}

function readBalance(payload: unknown): { balance: number; currency: string | null } | null {
  if (typeof payload === 'number' && Number.isFinite(payload)) return { balance: payload, currency: null }
  if (typeof payload === 'string' && payload.trim() && Number.isFinite(Number(payload))) {
    return { balance: Number(payload), currency: null }
  }
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null
  const value = payload as Record<string, unknown>
  const direct = value.balance ?? value.amount ?? value.available_balance
  const currency = typeof value.currency === 'string' ? value.currency : null
  if (typeof direct === 'number' && Number.isFinite(direct)) return { balance: direct, currency }
  if (typeof direct === 'string' && direct.trim() && Number.isFinite(Number(direct))) return { balance: Number(direct), currency }
  for (const nested of [value.data, value.result]) {
    const result = readBalance(nested)
    if (result) return { ...result, currency: result.currency ?? currency }
  }
  return null
}

async function captureBalance(
  provider: ProviderBalance['provider'],
  action: () => Promise<unknown>,
  configured: boolean,
): Promise<ProviderBalance> {
  if (!configured) return { provider, balance: null, currency: null, status: 'not_configured', message: 'Server credentials are not configured.' }
  try {
    const result = readBalance(await action())
    if (!result) return { provider, balance: null, currency: null, status: 'error', message: 'Provider response did not include a readable balance.' }
    return { provider, ...result, status: 'ok' }
  } catch {
    return { provider, balance: null, currency: null, status: 'error', message: 'Could not retrieve the live balance. Check credentials or provider availability.' }
  }
}

export async function POST() {
  const access = await requireAdmin()
  if ('error' in access) return Response.json({ error: access.error }, { status: access.status })

  const smsToken = process.env.SMS_PROVIDER_API_KEY
  const smmKey = process.env.SMM_PROVIDER_API_KEY
  const smmUrl = process.env.SMM_PROVIDER_API_URL
  const beanConfigured = Boolean(process.env.BEANSMS_API_KEY && process.env.BEANSMS_API_SECRET)

  const [fiveSim, jap, beanSms] = await Promise.all([
    captureBalance('5SIM', async () => {
      const baseUrl = (process.env.SMS_PROVIDER_BASE_URL || 'https://5sim.net/v1').replace(/\/$/, '')
      const response = await fetch(`${baseUrl}/user/profile`, {
        headers: { Authorization: `Bearer ${smsToken}`, Accept: 'application/json' },
        cache: 'no-store', signal: AbortSignal.timeout(15_000),
      })
      if (!response.ok) throw new Error('5SIM request failed')
      return response.json()
    }, Boolean(smsToken)),
    captureBalance('JustAnotherPanel', async () => {
      if (!smmUrl || !smmKey) throw new Error('JAP is not configured')
      const response = await fetch(smmUrl, {
        method: 'POST', cache: 'no-store', signal: AbortSignal.timeout(15_000),
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
        body: new URLSearchParams({ key: smmKey, action: 'balance' }),
      })
      if (!response.ok) throw new Error('JAP request failed')
      return response.json()
    }, Boolean(smmUrl && smmKey)),
    captureBalance('BeanSMS', () => beanSmsRequest('/balance'), beanConfigured),
  ])

  return Response.json({ checked_at: new Date().toISOString(), balances: [fiveSim, jap, beanSms] }, {
    headers: { 'Cache-Control': 'private, no-store' },
  })
}
