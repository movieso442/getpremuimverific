export const CRYPTO_ADDRESS = '0x00fc4c125204b1eb8983c6461ca08aed67bb1c4d'
export const CRYPTO_METHODS = {
  usdt_trc20: { label: 'USDT · Tron (TRC20)', asset: 'USDT', address: 'THbHsKFW8HFfzBk7zoueCZhiPLQVpb8e8N', explorer: 'https://tronscan.org/#/transaction/', decimals: 6, evm: false },
  btc_bitcoin: { label: 'BTC · Bitcoin', asset: 'BTC', address: '14voyLw2PUV3VFGLQEHbfMjcY5VPmKp54n', explorer: 'https://mempool.space/tx/', decimals: 8, evm: false },
  eth_erc20: { label: 'ETH · Ethereum (ERC20)', asset: 'ETH', address: CRYPTO_ADDRESS, explorer: 'https://etherscan.io/tx/', decimals: 18, evm: true },
  eth_bep20: { label: 'ETH · BNB Smart Chain (BEP20)', asset: 'ETH', address: CRYPTO_ADDRESS, explorer: 'https://bscscan.com/tx/', decimals: 18, evm: true },
} as const
export type CryptoMethod = keyof typeof CRYPTO_METHODS
export function isCryptoMethod(value: string): value is CryptoMethod {
  return Object.prototype.hasOwnProperty.call(CRYPTO_METHODS, value)
}

export function validCryptoHash(method: CryptoMethod, hash: string) {
  return (CRYPTO_METHODS[method].evm ? /^0x[0-9a-fA-F]{64}$/ : /^[0-9a-fA-F]{64}$/).test(hash)
}

export function validCryptoAmount(method: CryptoMethod, amount: string) {
  return new RegExp(`^\\d{1,10}(\\.\\d{1,${CRYPTO_METHODS[method].decimals}})?$`).test(amount) && Number(amount) > 0
}
