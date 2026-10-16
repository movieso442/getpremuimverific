import { useCallback, useEffect, useRef, useState } from 'react'
import { AppState, Linking, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import * as Clipboard from 'expo-clipboard'
import { api } from './client'
import { ActionButton } from './ui'

type Method = { label: string; asset: string; address: string; decimals: number }
type Claim = { id: string; payment_method: string; crypto_amount: string; amount_xaf: number; approved_amount_xaf: number | null; status: string }
type Status = { methods: Record<string, Method>; claims: Claim[]; pending_claim: Claim | null; pending_mobile: { reference: string } | null; crypto_available: boolean; availability_notice: string | null }
const money = (value: number) => Number(value).toLocaleString() + ' XAF'
const messageOf = (error: unknown) => error instanceof Error ? error.message : 'Please try again.'

export default function CryptoTopup({ active, onCredit }: { active: boolean; onCredit: () => void }) {
  const [status, setStatus] = useState<Status | null>(null)
  const [method, setMethod] = useState('usdt_trc20')
  const [amount, setAmount] = useState('5000')
  const [reference, setReference] = useState('')
  const [sentAmount, setSentAmount] = useState('')
  const [sent, setSent] = useState(false)
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [usdRate, setUsdRate] = useState<{ rate: number; date: string } | null>(null)
  const locked = useRef(false)
  const previousClaim = useRef<string | null>(null)
  const load = useCallback(async () => {
    try {
      const result = await api<Status>('/api/payments/manual-crypto')
      setStatus(result)
      if (previousClaim.current && !result.pending_claim) {
        const reviewed = result.claims.find(claim => claim.id === previousClaim.current)
        if (reviewed?.status === 'confirmed') { setNotice('Payment verified. Your wallet has been credited.'); onCredit() }
        else if (reviewed) setNotice('Payment reviewed. Check its status below or contact support.')
      }
      previousClaim.current = result.pending_claim?.id || null
    } catch (error) { setNotice(messageOf(error)) }
  }, [onCredit])
  useEffect(() => {
    if (!active) return
    void load()
    const timer = setInterval(() => { if (AppState.currentState === 'active') void load() }, 10000)
    return () => clearInterval(timer)
  }, [active, load])
  useEffect(() => {
    if (!active || method !== 'usdt_trc20') return
    let mounted = true
    void api<{ currency: string; rate: number; date: string }>('/api/display-currency?currency=USD')
      .then(result => { if (mounted && result.currency === 'USD' && Number.isFinite(result.rate) && result.rate > 0) setUsdRate({ rate: result.rate, date: result.date }) })
      .catch(() => undefined)
    return () => { mounted = false }
  }, [active, method])
  const selected = status?.methods?.[method]
  const credit = Number(amount)
  const validCredit = Number.isInteger(credit) && credit >= 3000 && credit <= 10000000
  const fee = validCredit ? Math.ceil(credit * 0.02) : 0
  const blocked = !status?.crypto_available || Boolean(status?.pending_claim || status?.pending_mobile)
  const submit = async () => {
    if (locked.current || !selected || blocked || !validCredit) return
    if (!reference.trim() || !new RegExp(`^\\d{1,10}(\\.\\d{1,${selected.decimals}})?$`).test(sentAmount.trim()) || Number(sentAmount) <= 0) {
      setNotice('Enter the transaction ID or explorer link and the exact crypto amount sent.'); return
    }
    locked.current = true; setBusy(true); setNotice('')
    try {
      await api('/api/payments/manual-crypto', { payment_method: method, amount_xaf: credit, crypto_amount: sentAmount.trim(), transfer_reference: reference.trim(), accepted_fee_percent: 2 })
      setSent(false); setReference(''); setSentAmount('')
      setNotice('Payment details received. Your wallet updates after the transfer is verified.')
      await load()
    } catch (error) { setNotice(messageOf(error) + ' Check your payment history before trying again.') }
    finally { locked.current = false; setBusy(false) }
  }
  const confirm = () => {
    if (!selected || !validCredit || blocked) return
    const text = `Hello, please confirm the ${selected.label} amount for ${credit} XAF wallet credit plus ${fee} XAF fee.`
    void Linking.openURL('https://wa.me/237640796062?text=' + encodeURIComponent(text)).catch(() => setNotice('Contact support to confirm the exact crypto amount before sending.'))
  }
  return <View style={s.container}>
    <Text style={s.title}>Pay with crypto</Text>
    <Text style={s.text}>Choose the exact asset and network. A 2% fee is added to your wallet credit. Network fees are separate.</Text>
    {!status && <Text style={s.text}>Checking payment availability…</Text>}
    {status?.availability_notice && <Text style={s.notice}>{status.availability_notice}</Text>}
    {status?.pending_mobile && <Text style={s.notice}>A mobile-money payment is being checked. Wait for its result before sending crypto.</Text>}
    {status?.pending_claim ? <View style={s.card}><Text style={s.title}>Payment under review</Text><Text style={s.text}>{status.methods[status.pending_claim.payment_method]?.label || 'Crypto'} · {status.pending_claim.crypto_amount} {status.methods[status.pending_claim.payment_method]?.asset || ''}</Text><Text style={s.text}>Requested wallet credit: {money(status.pending_claim.amount_xaf)}. Do not send another transfer while this payment is checked.</Text></View> : status && <>
      <Text style={s.label}>Asset and network</Text>
      <View style={s.choices}>{Object.entries(status.methods).map(([key, option]) => <Pressable key={key} accessibilityRole="button" accessibilityState={{ selected: method === key, disabled: blocked }} disabled={blocked} onPress={() => { setMethod(key); setSent(false); setNotice('') }} style={[s.choice, method === key && s.selected]}><Text style={s.choiceText}>{option.label}</Text></Pressable>)}</View>
      <Text style={s.label}>Amount to add to your wallet (XAF)</Text>
      <TextInput accessibilityLabel="Wallet credit in XAF" style={s.input} value={amount} onChangeText={value => { setAmount(value); setSent(false) }} keyboardType="number-pad" editable={!blocked && !busy} />
      <View style={s.choices}>{[3000,5000,10000,25000].map(value => <Pressable key={value} accessibilityRole="button" disabled={blocked} onPress={() => { setAmount(String(value)); setSent(false) }} style={s.choice}><Text style={s.choiceText}>{money(value)}</Text></Pressable>)}</View>
      {validCredit && <View style={s.quote}><Text style={s.text}>Wallet credit: {money(credit)}</Text><Text style={s.text}>2% fee: {money(fee)}</Text><Text style={s.strong}>Transfer value: {money(credit + fee)} plus network fees</Text>{method === 'usdt_trc20' && usdRate && <><Text style={s.text}>Estimated USDT: {(credit * usdRate.rate).toFixed(6)} credit + {(fee * usdRate.rate).toFixed(6)} fee = {((credit + fee) * usdRate.rate).toFixed(6)} total</Text><Text style={s.small}>USD reference dated {usdRate.date}; approximately 1 USD per USDT. Confirm the exact amount before sending.</Text></>}</View>}
      {selected && validCredit && !blocked && <><ActionButton secondary title="Confirm exact crypto amount with support" onPress={confirm} /><View style={s.card}><Text style={s.label}>{selected.label} receiving address</Text><Text selectable style={s.address}>{selected.address}</Text><ActionButton secondary title="Copy receiving address" onPress={() => void Clipboard.setStringAsync(selected.address).then(() => setNotice('Address copied.')).catch(() => setNotice('Press and hold the address to copy it.'))} /><Text style={s.small}>Send only {selected.asset} on this network. Confirm the exact amount with support first and pay network fees separately.</Text></View>
        {!sent ? <ActionButton title="I've paid" onPress={() => setSent(true)} /> : <View style={s.card}><Text style={s.title}>Find your payment</Text><Text style={s.text}>Paste the transaction ID or explorer link and enter the exact amount shown in your receipt.</Text><Text style={s.label}>Payment reference</Text><TextInput accessibilityLabel="Crypto transaction ID or explorer link" style={s.input} value={reference} onChangeText={setReference} autoCapitalize="none" editable={!busy} /><Text style={s.label}>Amount sent ({selected.asset})</Text><TextInput accessibilityLabel={`Amount sent in ${selected.asset}`} style={s.input} value={sentAmount} onChangeText={setSentAmount} keyboardType="decimal-pad" editable={!busy} /><ActionButton title={busy ? 'Submitting…' : 'Find my payment'} disabled={busy} onPress={() => void submit()} /></View>}</>}
    </>}
    {!!notice && <Text accessibilityLiveRegion="polite" style={s.notice}>{notice}</Text>}
    {!!status?.claims?.length && <View style={s.card}><Text style={s.label}>Recent crypto payments</Text>{status.claims.slice(0,4).map(claim => <Text key={claim.id} style={s.text}>{status.methods[claim.payment_method]?.label || 'Crypto'} · {claim.status === 'confirmed' ? `${money(Number(claim.approved_amount_xaf))} credited` : claim.status}</Text>)}</View>}
  </View>
}

const s = StyleSheet.create({ container: { gap: 14 }, card: { backgroundColor: '#fff', borderRadius: 20, borderWidth: 1, borderColor: '#e3e9f2', padding: 18, gap: 12 }, title: { fontSize: 18, fontWeight: '800', color: '#10233f' }, label: { fontSize: 13, fontWeight: '800', color: '#334155' }, text: { fontSize: 14, color: '#52647a', lineHeight: 22 }, small: { fontSize: 12, color: '#52647a', lineHeight: 18 }, strong: { fontSize: 15, fontWeight: '800', color: '#10233f' }, address: { fontSize: 14, color: '#10233f', lineHeight: 22 }, input: { minHeight: 52, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 16, backgroundColor: '#fff', padding: 14, fontSize: 16, color: '#10233f' }, choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, choice: { minHeight: 48, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: '#e3e9f2', borderRadius: 14, backgroundColor: '#fff' }, choiceText: { color: '#334155', fontWeight: '700', fontSize: 13 }, selected: { borderColor: '#fdba74', backgroundColor: '#ffedd5' }, quote: { backgroundColor: '#fff7ed', borderRadius: 18, padding: 16, gap: 7 }, notice: { backgroundColor: '#eff6ff', borderRadius: 16, padding: 16, color: '#1e40af', lineHeight: 22 } })
