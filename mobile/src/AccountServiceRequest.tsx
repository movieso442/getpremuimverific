import { useEffect, useState } from 'react'
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { api } from './client'

type RequestRow = { id: string; platform: string; quantity: number; state: string; quote_xaf: number | null }

export default function AccountServiceRequest() {
  const [platform, setPlatform] = useState('facebook')
  const [requirements, setRequirements] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [details, setDetails] = useState('')
  const [rows, setRows] = useState<RequestRow[]>([])
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    let active = true
    void api<{ requests: RequestRow[] }>('/api/account-service-requests').then(result => { if (active) setRows(result.requests) }).catch(() => undefined)
    return () => { active = false }
  }, [])
  const submit = async () => {
    if (busy) return
    if (requirements.trim().length < 10 || details.trim().length < 10 || !Number.isInteger(Number(quantity)) || Number(quantity) < 1 || Number(quantity) > 100) {
      setNotice('Describe what you need in at least 10 characters, add details and choose 1–100 items.'); return
    }
    setBusy(true); setNotice('')
    try {
      const result = await api<{ id: string }>('/api/account-service-requests', { platform, requirements: requirements.trim(), quantity: Number(quantity), details: details.trim() })
      setRows(current => [{ id: result.id, platform, quantity: Number(quantity), state: 'pending', quote_xaf: null }, ...current])
      setRequirements(''); setDetails(''); setQuantity('1')
      setNotice('Request received. We will review availability and price before any payment.')
    } catch (reason) { setNotice(reason instanceof Error ? reason.message : 'Could not send your request.') }
    finally { setBusy(false) }
  }
  return <View style={styles.card}><Text style={styles.title}>Account services</Text><Text style={styles.body}>Tell us what you need. Our team reviews availability and a quote. This request does not charge your wallet or guarantee delivery.</Text><Text style={styles.label}>Platform</Text><View style={styles.row}>{['facebook','instagram','tiktok','other'].map(value => <Pressable key={value} onPress={() => setPlatform(value)} accessibilityRole="button" accessibilityState={{ selected: platform === value }} style={[styles.chip,platform === value && styles.active]}><Text style={styles.chipText}>{value}</Text></Pressable>)}</View><Text style={styles.label}>What do you need?</Text><TextInput value={requirements} onChangeText={setRequirements} maxLength={300} placeholder="Describe the account or service" style={styles.input} /><Text style={styles.label}>Quantity</Text><TextInput value={quantity} onChangeText={setQuantity} keyboardType="number-pad" style={styles.input} /><Text style={styles.label}>Additional details</Text><TextInput value={details} onChangeText={setDetails} maxLength={1000} multiline placeholder="Explain your requirements; never include passwords or codes" style={[styles.input,styles.multiline]} /><Pressable disabled={busy} onPress={() => void submit()} style={styles.button} accessibilityRole="button"><Text style={styles.buttonText}>{busy ? 'Sending…' : 'Send for review'}</Text></Pressable>{!!notice && <Text accessibilityLiveRegion="polite" style={styles.notice}>{notice}</Text>}<Text style={styles.title}>Your requests</Text>{rows.length === 0 && <Text style={styles.body}>No requests yet.</Text>}{rows.map(row => <View key={row.id} style={styles.request}><Text style={styles.body}>{row.platform} · {row.quantity} · {row.state}</Text>{row.quote_xaf != null && <Text style={styles.body}>Indicative quote: {Number(row.quote_xaf).toLocaleString()} XAF. Confirm with support before paying.</Text>}</View>)}</View>
}

const styles = StyleSheet.create({
  card:{backgroundColor:'#fff',borderRadius:24,borderWidth:1,borderColor:'#e3e9f2',padding:20,gap:12},
  title:{fontSize:18,fontWeight:'800',color:'#10233f'},body:{fontSize:14,color:'#52647a',lineHeight:21},
  label:{fontSize:13,color:'#334155',fontWeight:'800'},input:{minHeight:52,borderWidth:1,borderColor:'#cbd5e1',borderRadius:14,padding:13,fontSize:15,color:'#10233f'},multiline:{minHeight:90,textAlignVertical:'top'},
  row:{flexDirection:'row',flexWrap:'wrap',gap:6},chip:{borderWidth:1,borderColor:'#cbd5e1',borderRadius:12,padding:9},active:{borderColor:'#f97316',backgroundColor:'#ffedd5'},chipText:{fontSize:12,color:'#334155',textTransform:'capitalize'},
  button:{backgroundColor:'#c2410c',borderRadius:14,padding:16,alignItems:'center'},buttonText:{color:'#fff',fontWeight:'800'},notice:{padding:12,backgroundColor:'#eff6ff',color:'#1e40af',borderRadius:12},request:{borderTopWidth:1,borderColor:'#e3e9f2',paddingTop:10},
})
