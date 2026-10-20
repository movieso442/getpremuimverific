import { randomBytes } from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { getMinimumTopupXaf, FALLBACK_MINIMUM_TOPUP_XAF } from '@/lib/payments/minimum'

function appUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL || 'https://premiumverific.com').replace(/\/$/, '')
}

export async function createBotCheckoutLink(profileId: string, amount: number) {
  const roundedAmount = Math.round(Number(amount))
  if (!profileId || !Number.isFinite(roundedAmount)) return null
  const token = randomBytes(32).toString('base64url')
  const admin = createAdminClient()
  if (roundedAmount < await getMinimumTopupXaf(admin)) return null
  const { error } = await admin.from('bot_payment_links').insert({
    token,
    profile_id: profileId,
    amount_xaf: roundedAmount,
    expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
  })
  if (error) {
    console.error('[Bot checkout link creation failed]', error.message)
    return null
  }
  return `${appUrl()}/bot-topup?token=${encodeURIComponent(token)}`
}

export const BOT_TOPUP_MINIMUM_XAF = FALLBACK_MINIMUM_TOPUP_XAF
export async function getBotTopupMinimumXaf() { return getMinimumTopupXaf(createAdminClient()) }
