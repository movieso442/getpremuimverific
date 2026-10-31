/** Map only supplier-confirmed, code-free terminal outcomes to wallet-settlement states. */
export function unusedActivationFinalStatus(
  status: unknown,
  messages: Array<{ code?: string }> | undefined,
): 'canceled' | 'expired' | null {
  if (!Array.isArray(messages) || messages.length > 0 || messages.some(message => Boolean(message.code))) return null
  const normalized = String(status || '').toUpperCase()
  if (normalized === 'TIMEOUT') return 'expired'
  if (normalized === 'CANCELED' || normalized === 'BANNED') return 'canceled'
  return null
}
