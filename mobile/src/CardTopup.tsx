import { useCallback, useEffect, useRef, useState } from 'react'
import { AppState, StyleSheet, Text, TextInput, View } from 'react-native'
import * as SecureStore from 'expo-secure-store'
import * as Crypto from 'expo-crypto'
import * as WebBrowser from 'expo-web-browser'
import { api } from './client'
import { ActionButton } from './ui'

type Payment = { reference: string; status: string; amount: number; service_fee_xaf: number; checkout_url?: string; expires_at?: string }
const checkoutUrl = (value?: string) => {
  try { const u = new URL(value || ''); return u.protocol === 'https:' && u.hostname === 'checkout.payunit.net' && !u.port && !u.username && !u.password && !u.search && !u.hash && /^\/PU_LIVE_[a-f0-9-]{36}$/i.test(u.pathname) ? u.href : null } catch { return null }
}
export default function CardTopup({ userId, onCredit }: { userId: string; onCredit: () => void }) {
  const [amount, setAmount] = useState('5000'), [available, setAvailable] = useState(false)
  const [payment, setPayment] = useState<Payment | null>(null), [notice, setNotice] = useState(''), [busy, setBusy] = useState(true)
  const key = useRef(''), locked = useRef(false), credited = useRef('')
  const storageKey = 'pv-card.' + userId
  const refresh = useCallback(async () => {
    const result = await api<{ available: boolean; payment: Payment | null }>('/api/payments/cards' + (key.current ? '?key=' + encodeURIComponent(key.current) : ''))
    setAvailable(result.available); setPayment(result.payment)
    if (result.payment?.status === 'completed' && credited.current !== result.payment.reference) { credited.current = result.payment.reference; onCredit() }
  }, [onCredit])
  useEffect(() => {
    void SecureStore.getItemAsync(storageKey).then(value => { key.current = value || ''; return refresh() }).catch(() => setNotice('Could not check card payments. Check your wallet history before paying.')).finally(() => setBusy(false))
  }, [storageKey, refresh])
  useEffect(() => {
    const timer = setInterval(() => { if (payment?.status === 'pending' && AppState.currentState === 'active') void refresh().catch(() => setNotice('Verification delayed. Do not pay again yet.')) }, 6000)
    return () => clearInterval(timer)
  }, [payment?.status, refresh])
  async function openCheckout(url?: string) {
    const valid = checkoutUrl(url)
    if (!valid) { setNotice('Checkout could not be confirmed. Contact support before paying again.'); return }
    await WebBrowser.openBrowserAsync(valid)
    await refresh()
  }
  async function start() {
    if (locked.current || busy || payment?.status === 'pending') return
    const credit = Number(amount)
    if (!Number.isInteger(credit) || credit < 3000 || credit > 100000) { setNotice('Enter a whole amount from 3,000 to 100,000 XAF.'); return }
    locked.current = true; setBusy(true); setNotice('')
    try {
      key.current ||= Crypto.randomUUID()
      await SecureStore.setItemAsync(storageKey, key.current)
      const result = await api<{ reference: string; status: string; checkout_url?: string; message?: string }>('/api/payments/cards', { amount: credit, accepted_fee_percent: 1.4, idempotency_key: key.current })
      setPayment({ ...result, amount: credit, service_fee_xaf: Math.ceil(credit * 14 / 1000) })
      if (result.checkout_url && result.status === 'pending') await openCheckout(result.checkout_url)
      else setNotice(result.message || 'Check this payment before paying again.')
    } catch (error) { setNotice((error instanceof Error ? error.message : 'Checkout unavailable.') + ' Keep this request; check status before retrying.') }
    finally { locked.current = false; setBusy(false) }
  }
  const credit = payment ? Number(payment.amount) : Number(amount), fee = payment ? Number(payment.service_fee_xaf) : Math.ceil(credit * 14 / 1000)
  return <View style={s.card}>
    <Text style={s.title}>Pay by card</Text><Text style={s.text}>Secure Payunit checkout. Card acceptance depends on your bank and the available payment networks.</Text>
    <Text accessibilityRole="header" style={s.label}>Wallet credit (XAF)</Text>
    <TextInput accessibilityLabel="Card top-up wallet credit in XAF" style={s.input} keyboardType="number-pad" value={payment ? String(payment.amount) : amount} onChangeText={setAmount} editable={!busy && !payment} />
    <View style={s.summary}><Text style={s.text}>Wallet receives: {credit.toLocaleString()} XAF</Text><Text style={s.text}>Card fee (1.4%): {fee.toLocaleString()} XAF</Text><Text style={s.label}>Total payment: {(credit + fee).toLocaleString()} XAF</Text></View>
    <Text style={s.text}>Your card number and CVV stay on Payunit’s checkout. Your bank may request authentication or charge conversion fees.</Text>
    {payment ? <><Text accessibilityLiveRegion="polite" style={s.label}>{payment.status === 'completed' ? 'Verified — wallet credited' : payment.status === 'failed' ? 'Payment not completed' : 'Payment pending — do not pay twice'}</Text><Text selectable style={s.text}>Reference: {payment.reference}</Text>
      {payment.status === 'pending' && checkoutUrl(payment.checkout_url) && (!payment.expires_at || new Date(payment.expires_at).getTime() > Date.now()) && <ActionButton title="Resume secure checkout" onPress={() => void openCheckout(payment.checkout_url).catch(() => setNotice('Check your payment status before retrying.'))} />}
      {payment.status !== 'pending' && <ActionButton secondary title="Choose another card top-up" onPress={() => void SecureStore.deleteItemAsync(storageKey).then(() => { key.current = ''; setPayment(null); setNotice('') })} />}
    </> : <ActionButton title={busy ? 'Checking…' : available ? 'Continue to secure checkout' : 'Cards not enabled yet'} disabled={busy || !available} onPress={() => void start()} />}
    <ActionButton secondary title="Check card payment status" onPress={() => void refresh().catch(() => setNotice('Cannot verify yet. Do not start another payment.'))} />
    {!!notice && <Text accessibilityLiveRegion="polite" style={s.notice}>{notice}</Text>}
    <Text style={s.small}>3,000–100,000 XAF per top-up. Only wallet credit is added to your balance. Closing checkout does not cancel a submitted payment.</Text>
  </View>
}
const s = StyleSheet.create({ card: { backgroundColor: '#fff', borderRadius: 24, borderWidth: 1, borderColor: '#e3e9f2', padding: 20, gap: 14 }, title: { fontSize: 20, fontWeight: '800', color: '#10233f' }, label: { fontSize: 14, fontWeight: '700', color: '#10233f' }, text: { fontSize: 14, lineHeight: 22, color: '#52647a' }, small: { fontSize: 12, lineHeight: 18, color: '#52647a' }, input: { minHeight: 52, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 16, padding: 16, fontSize: 18 }, summary: { padding: 16, borderRadius: 16, backgroundColor: '#fff7ed', gap: 8 }, notice: { padding: 16, borderRadius: 16, backgroundColor: '#eff6ff', color: '#1e40af' } })
