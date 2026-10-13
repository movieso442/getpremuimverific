import { CRYPTO_METHODS, type CryptoMethod, validCryptoHash } from './manual-crypto'
export function normalizeCryptoReference(method: CryptoMethod, input: string): string | null {
  const value = input.trim()
  if (validCryptoHash(method, value)) return value.toLowerCase()
  try {
    const url = new URL(value)
    const expected = new URL(CRYPTO_METHODS[method].explorer)
    if (url.protocol !== 'https:' || url.hostname !== expected.hostname || url.username || url.password) return null
    const route = method === 'usdt_trc20' ? url.hash.replace(/^#/, '') : url.pathname
    const prefix = method === 'usdt_trc20' ? '/transaction/' : '/tx/'
    if (!route.startsWith(prefix)) return null
    const hash = route.slice(prefix.length).split(/[/?]/)[0]
    return validCryptoHash(method, hash) ? hash.toLowerCase() : null
  } catch { return null }
}
