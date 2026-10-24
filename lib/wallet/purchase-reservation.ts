import { randomUUID } from 'node:crypto'
import { createAdminClient } from '@/lib/supabase/admin'

type Admin = ReturnType<typeof createAdminClient>
type PurchaseType = 'smm_order' | 'sms_purchase'

export class PurchaseReservationError extends Error {
  constructor(message: string, public readonly status: number) { super(message) }
}

export async function reserveWalletPurchase(admin: Admin, profileId: string, type: PurchaseType, source: 'web' | 'bot', amountXaf: number) {
  const id = randomUUID()
  const { error } = await admin.rpc('reserve_wallet_purchase', {
    p_id: id, p_profile: profileId, p_type: type, p_source: source, p_amount: amountXaf,
  })
  if (error) {
    if (error.message.includes('Insufficient wallet balance'))
      throw new PurchaseReservationError('Insufficient wallet balance.', 402)
    if (error.message.includes('Purchases paused during refund review'))
      throw new PurchaseReservationError('Purchases are paused while a refund is being settled.', 409)
    console.error('[Wallet reservation failed]', error)
    throw new PurchaseReservationError('Ordering is temporarily unavailable. No supplier order was placed and no funds were charged.', 503)
  }
  return id
}

export async function markWalletPurchaseSubmitted(admin: Admin, id: string, providerOrderId: string) {
  const { error } = await admin.rpc('mark_wallet_purchase_submitted', { p_id: id, p_provider_order_id: providerOrderId })
  if (error) throw error
}

export async function releaseWalletPurchase(admin: Admin, id: string) {
  const { error } = await admin.rpc('release_wallet_purchase', { p_id: id })
  if (error) throw error
}
