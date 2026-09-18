import { NextResponse } from 'next/server'
import { convertCurrency, SupportedCurrency } from '@/lib/currency'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { amount, crypto = 'USDT', currency = 'USD' } = body

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Valid deposit amount required' }, { status: 400 })
    }

    const inputCurrency = (currency as string).toUpperCase() as SupportedCurrency
    const usdAmount = inputCurrency === 'XAF' || inputCurrency === 'XOF'
      ? convertCurrency(amount, inputCurrency, 'USD')
      : amount

    const coinbaseApiKey = process.env.COINBASE_COMMERCE_API_KEY

    if (coinbaseApiKey) {
      try {
        const cbRes = await fetch('https://api.commerce.coinbase.com/charges', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CC-Api-Key': coinbaseApiKey,
            'X-CC-Version': '2018-03-22'
          },
          body: JSON.stringify({
            name: 'Premium Verify Wallet Deposit',
            description: `Top up wallet with $${usdAmount.toFixed(2)} USD via ${crypto.toUpperCase()}`,
            pricing_type: 'fixed_price',
            local_price: {
              amount: String(usdAmount.toFixed(2)),
              currency: 'USD'
            },
            metadata: {
              original_amount: String(amount),
              original_currency: inputCurrency,
              crypto_asset: crypto.toUpperCase()
            },
            redirect_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://getpremuimverific.vercel.app'}/add-funds?status=success`,
            cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://getpremuimverific.vercel.app'}/add-funds`
          })
        })

        const cbData = await cbRes.json()
        if (cbData.data && cbData.data.hosted_url) {
          return NextResponse.json({
            success: true,
            status: 'REDIRECT',
            hosted_url: cbData.data.hosted_url,
            code: cbData.data.code,
            addresses: cbData.data.addresses,
            amount_usd: usdAmount
          })
        }
      } catch (err) {
        console.warn('Coinbase Commerce API fallback to static address:', err)
      }
    }

    // Static Crypto Deposit Addresses Fallback
    const cryptoType = crypto.toUpperCase()
    const usdtAddress = process.env.BITCOIN_USDT_WALLET_ADDRESS || 'TYP7vX9zK2L3m4N5p6Q7R8s9T0u1V2W3X4Y5Z'
    const btcAddress = process.env.BITCOIN_BTC_WALLET_ADDRESS || 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh'

    const targetAddress = cryptoType === 'BTC' ? btcAddress : usdtAddress
    const targetNetwork = cryptoType === 'BTC' ? 'Bitcoin Mainnet' : 'USDT TRC20 / BEP20'

    return NextResponse.json({
      success: true,
      status: 'COMPLETED',
      crypto: cryptoType,
      amount,
      amount_usd: usdAmount,
      address: targetAddress,
      network: targetNetwork,
      message: `Send exact ${cryptoType} equivalent to address ${targetAddress}. Wallet balance updates automatically upon 1 network confirmation.`
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Crypto payment failed' }, { status: 500 })
  }
}
