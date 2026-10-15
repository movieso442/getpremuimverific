import { useCallback, useEffect, useRef, useState } from 'react'
import { Alert, AppState, Image, KeyboardAvoidingView, Linking, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import * as WebBrowser from 'expo-web-browser'
import * as SecureStore from 'expo-secure-store'
import * as Crypto from 'expo-crypto'
import * as Clipboard from 'expo-clipboard'
import * as Haptics from 'expo-haptics'
import { ActionButton, Icon, ScreenTransition, useReducedMotion } from './src/ui'
import type { Session } from '@supabase/supabase-js'
import { api, configured, manageRefresh, supabase } from './src/client'
import { completeNativeAuth, signupRedirect, startNativeAuth } from './src/auth'
import { isNativeAuthUrl, nativeAuthRedirect } from './src/auth-links'
WebBrowser.maybeCompleteAuthSession()

type Account = { profile: { id: string; email: string; full_name: string; balance_xaf: number }; transactions: { id: string; amount: number; type: string; status: string; reference: string }[]; orders: { id: string; service_name: string; quantity: number; status: string }[] }
type SmsOrder = { id: string; provider_order_id: string; service_name: string; country_name: string; phone_number: string; sms_code: string | null; status: string; expires_at: string }
type Choice = { code: string; name: string }
type Service = { service_id: number; id: number; name: string; category: string; retail_rate_xaf: number; min: number; max: number }
type Tab = 'Numbers' | 'Inbox' | 'Boost' | 'Wallet' | 'Account'
const money = (value: number) => Number(value).toLocaleString() + ' XAF'
const messageOf = (error: unknown) => error instanceof Error ? error.message : 'Please try again shortly.'
const Button = ActionButton
function StepLabel({ title, detail }: { title: string; detail: string }) {
  return <View style={s.sectionHeading}><Text style={s.title}>{title}</Text><Text style={s.text}>{detail}</Text></View>
}
function Choices({ items, selected, onSelect }: { items: Choice[]; selected: string; onSelect: (value: string) => void }) {
  return <View style={s.choiceGrid}>{items.map(item => <Pressable key={item.code} accessibilityRole="button" accessibilityState={{ selected: selected === item.code }} onPress={() => onSelect(item.code)} style={[s.chip, selected === item.code && s.selected]}><Text style={[s.chipText, selected === item.code && { color: '#9a3412' }]}>{item.name}</Text>{selected === item.code && <Icon name="checkmark-circle" color="#c2410c" size={17} />}</Pressable>)}</View>
}
export default function App() {
  return <SafeAreaProvider><SafeAreaView style={s.safe}><StatusBar style="dark" /><KeyboardAvoidingView style={s.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><Application /></KeyboardAvoidingView></SafeAreaView></SafeAreaProvider>
}
function Application() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState('')
  useEffect(() => {
    if (!supabase) { setLoading(false); return }
    let mounted = true
    void supabase.auth.getSession().then(({ data }) => { if (mounted) { setSession(data.session); setLoading(false) } }).catch(() => { if (mounted) setLoading(false) })
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next))
    const receive = (url: string) => {
      if (!isNativeAuthUrl(url)) return
      setAuthError('')
      void completeNativeAuth(url).catch(error => { if (mounted) setAuthError(messageOf(error)) })
    }
    const links = Linking.addEventListener('url', event => receive(event.url))
    void Linking.getInitialURL().then(url => { if (mounted && url) receive(url) }).catch(() => undefined)
    const stop = manageRefresh()
    return () => { mounted = false; data.subscription.unsubscribe(); links.remove(); stop() }
  }, [])
  if (!configured) return <View style={s.card}><Text style={s.title}>premiumverific</Text><Text style={s.text}>Set the public API URL and Supabase project variables in mobile/.env to connect this app. Never add server/provider secrets.</Text></View>
  if (loading) return <Text style={s.text}>Restoring your account...</Text>
  return session ? <Panel key={session.user.id} userId={session.user.id} /> : <Login authError={authError} />
}
function Login({ authError }: { authError: string }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [signup, setSignup] = useState(false), [fullName, setFullName] = useState(''), [confirmation, setConfirmation] = useState('')
  const [terms, setTerms] = useState(false), [confirmationRequested, setConfirmationRequested] = useState(false), [cooldown, setCooldown] = useState(0)
  useEffect(() => { if (cooldown <= 0) return; const timer = setTimeout(() => setCooldown(value => value - 1), 1000); return () => clearTimeout(timer) }, [cooldown])
  const confirmationNotice = 'Request accepted. If this address needs confirmation, check your inbox and spam folder. If you already used Google, sign in with Google; another signup email may not be sent.'
  const submit = async () => {
    if (!supabase || busy) return
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || !password) { setNotice('Enter a valid email address and password.'); return }
    if (signup && (password.length < 8 || password !== confirmation || !terms)) { setNotice('Use at least 8 characters, repeat the same password and agree to the Terms of Service.'); return }
    setBusy(true)
    setNotice('')
    try {
      const result = signup ? await supabase.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: await startNativeAuth('signup'), data: { full_name: fullName.trim() || undefined } } }) : await supabase.auth.signInWithPassword({ email: email.trim(), password })
      if (result.error) throw result.error
      if (signup && !result.data.session) { setNotice(confirmationNotice); setConfirmationRequested(true); setCooldown(60) }
    } catch (error) { setNotice(messageOf(error)) } finally { setBusy(false) }
  }
  const resend = async () => {
    if (!supabase || busy || cooldown > 0 || !email.trim()) return
    setBusy(true)
    try {
      const { error } = await supabase.auth.resend({ type: 'signup', email: email.trim(), options: { emailRedirectTo: await signupRedirect() } })
      if (error) throw error
      setNotice(confirmationNotice); setCooldown(60)
    } catch (error) { setNotice(messageOf(error)) } finally { setBusy(false) }
  }
  const google = async () => {
    if (!supabase || busy) return
    setBusy(true)
    try {
      const redirectTo = await startNativeAuth('oauth')
      const { data, error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo, skipBrowserRedirect: true } })
      if (error || !data.url) throw error || new Error('Google sign-in is unavailable.')
      const result = await WebBrowser.openAuthSessionAsync(data.url, nativeAuthRedirect)
      if (result.type === 'success') {
        await completeNativeAuth(result.url)
      } else setNotice('Google sign-in was closed. You can try again.')
    } catch (error) { setNotice(messageOf(error)) } finally { setBusy(false) }
  }
  return <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
    <View style={s.row}><Image source={require('./assets/app-icon.png')} accessibilityLabel="premiumverific logo" style={{width:64,height:64}} /><Text style={s.subtitle}>premiumverific</Text></View><Text style={s.title}>Your numbers. Your panel.</Text>
    <Text style={s.text}>{signup ? 'Create your account here. The same account works on the app and website.' : 'Sign in with your existing website account. Your wallet and OTP inbox stay together.'}</Text>
    <View style={s.card}>
      <Text style={s.subtitle}>{signup ? 'Create your account' : 'Welcome back'}</Text>
      {signup && <><Text style={s.label}>Full name</Text><TextInput accessibilityLabel="Full name" style={s.input} value={fullName} onChangeText={setFullName} autoComplete="name" maxLength={120} editable={!busy} /></>}
      <Text style={s.label}>Email</Text><TextInput accessibilityLabel="Email" style={s.input} value={email} onChangeText={setEmail} autoCapitalize="none" autoComplete="email" keyboardType="email-address" editable={!busy} />
      <Text style={s.label}>Password{signup ? ' (at least 8 characters)' : ''}</Text><TextInput accessibilityLabel="Password" style={s.input} value={password} onChangeText={setPassword} secureTextEntry autoComplete={signup ? 'new-password' : 'current-password'} editable={!busy} />
      {signup && <><Text style={s.label}>Confirm password</Text><TextInput accessibilityLabel="Confirm password" style={s.input} value={confirmation} onChangeText={setConfirmation} secureTextEntry autoComplete="new-password" editable={!busy} /><Pressable accessibilityRole="checkbox" accessibilityLabel="I agree to the Terms of Service" accessibilityState={{ checked: terms }} onPress={() => setTerms(value => !value)} style={[s.row,{minHeight:48}]}><Icon name={terms ? 'checkbox' : 'square-outline'} color="#c2410c" /><Text style={s.text}>I agree to the Terms of Service</Text></Pressable><Button secondary title="Read Terms of Service" onPress={() => void Linking.openURL('https://premiumverific.com/terms')} /></>}
      <Button title={busy ? 'Please wait…' : signup ? 'Create my account' : 'Sign in'} disabled={busy || (signup && cooldown > 0)} onPress={() => void submit()} />
      <Button secondary title={signup ? 'Already registered? Sign in' : 'Create an account'} disabled={busy} onPress={() => { setSignup(value => !value); setNotice('') }} />
      <Button title="Continue with Google" disabled={busy} onPress={() => void google()} />
      {confirmationRequested && <Button secondary title={cooldown > 0 ? `Request another confirmation in ${cooldown}s` : 'Request another confirmation'} disabled={busy || cooldown > 0} onPress={() => void resend()} />}
      {!!notice && <Text accessibilityLiveRegion="polite" style={s.notice}>{notice}</Text>}
      {!!authError && <Text accessibilityLiveRegion="polite" style={s.notice}>{authError}</Text>}
    </View>
    <Pressable onPress={() => void Linking.openURL('https://premiumverific.com/login')}><Text style={s.link}>Need help signing in? Open the website</Text></Pressable>
  </ScrollView>
}
function Panel({ userId }: { userId: string }) {
  const [tab, setTab] = useState<Tab>('Numbers')
  const [account, setAccount] = useState<Account | null>(null)
  const [inbox, setInbox] = useState<SmsOrder[]>([])
  const [notice, setNotice] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const refreshingRef = useRef(false)
  const otpRefreshingRef = useRef(false)
  const scroll = useRef<ScrollView>(null)
  const reduced = useReducedMotion()
  const [visited, setVisited] = useState<Tab[]>(['Numbers'])
  const mounted = useRef(true)
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])
  const load = useCallback(async (showSpinner = false) => {
    if (refreshingRef.current) return
    refreshingRef.current = true
    if (showSpinner) setRefreshing(true)
    try {
      // Render independently: one failed OTP check must not hide the wallet.
      const results = await Promise.allSettled([
        api<Account>('/api/mobile/account').then(value => { if (mounted.current) setAccount(value); return value }),
        api<{ orders: SmsOrder[] }>('/api/v1/sms/order'),
      ])
      if (!mounted.current) return
      const accountResult = results[0], inboxResult = results[1]
      if (accountResult.status === 'fulfilled') setAccount(accountResult.value)
      if (inboxResult.status === 'fulfilled') {
        setInbox(inboxResult.value.orders)
        const waiting = inboxResult.value.orders.filter(order => order.status === 'waiting_sms' && !order.sms_code).slice(0, 5)
        // Concurrent reads replace the old serial 5 x provider timeout wait.
        if (waiting.length && !otpRefreshingRef.current) {
          otpRefreshingRef.current = true
          void Promise.allSettled(waiting.map(order => api('/api/v1/sms/order', { action: 'getSms', id: order.provider_order_id })))
            .then(async () => {
              if (!mounted.current) return
              const latest = await api<{ orders: SmsOrder[] }>('/api/v1/sms/order')
              if (mounted.current) setInbox(latest.orders)
            })
            .catch(error => { if (mounted.current) setNotice(messageOf(error)) })
            .finally(() => { otpRefreshingRef.current = false })
        }
      }
      if (mounted.current) setNotice(results.some(result => result.status === 'rejected') ? 'Some data could not refresh. Your saved screen stays available; pull down to retry.' : '')
    } catch (error) { if (mounted.current) setNotice(messageOf(error)) }
    finally { refreshingRef.current = false; if (mounted.current) setRefreshing(false) }
  }, [])
  useEffect(() => {
    void load()
    const timer = setInterval(() => { if (AppState.currentState === 'active') void load() }, 10000)
    const resume = AppState.addEventListener('change', state => { if (state === 'active') void load() })
    return () => { clearInterval(timer); resume.remove() }
  }, [load])
  const navigate = (value: Tab) => {
    setVisited(current => current.includes(value) ? current : [...current, value])
    setTab(value)
    scroll.current?.scrollTo({ y: 0, animated: !reduced })
  }
  const waiting = inbox.filter(order => order.status === 'waiting_sms' && !order.sms_code).length
  const tabIcons = { Numbers: 'keypad-outline', Inbox: 'chatbox-ellipses-outline', Boost: 'trending-up-outline', Wallet: 'wallet-outline', Account: 'person-circle-outline' } as const
  const [copyNotice, setCopyNotice] = useState('')
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => { if (copyTimer.current) clearTimeout(copyTimer.current) }, [])
  const copy = async (value: string) => {
    try {
      await Clipboard.setStringAsync(value)
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined)
      setCopyNotice('Copied. Ready to paste.')
      if (copyTimer.current) clearTimeout(copyTimer.current)
      copyTimer.current = setTimeout(() => setCopyNotice(''), 2500)
    } catch { setCopyNotice('Could not copy. Press and hold the code to select it.') }
  }
  return <View style={s.fill}>
    <View style={s.header}>
      <Image source={require('./assets/app-icon.png')} accessibilityLabel="premiumverific logo" style={{width:36,height:36}} /><View style={{ flex: 1, minWidth: 0 }}><Text numberOfLines={1} style={s.brand}>premiumverific</Text><Text numberOfLines={1} style={s.greeting}>{account?.profile.full_name ? 'Hi, ' + account.profile.full_name.split(' ')[0] : 'Welcome back'}</Text></View>
      <Pressable accessibilityRole="button" accessibilityLabel="Open wallet" onPress={() => navigate('Wallet')} style={s.walletBadge}><Icon name="wallet-outline" color="#1d4ed8" size={18} /><Text style={s.balance}>{account ? money(account.profile.balance_xaf) : 'Loading...'}</Text></Pressable>
    </View>
    <ScrollView ref={scroll} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} />}>
      {!!notice && <Text accessibilityLiveRegion="polite" style={s.notice}>{notice}</Text>}
      {visited.includes('Numbers') && <ScreenTransition active={tab === 'Numbers'}><Numbers onPurchased={() => { navigate('Inbox'); void load() }} /></ScreenTransition>}
      <ScreenTransition active={tab === 'Inbox'}>
        <StepLabel title="Your codes, right here" detail="Updates while the app is open. Tap to copy a number or code." />
        {!inbox.length && <View style={s.empty}><Icon name="chatbox-ellipses-outline" size={38} color="#c2410c" /><Text style={s.subtitle}>Your inbox is ready</Text><Text style={s.text}>Get a number and its code will appear here.</Text><Button title="Get a number" onPress={() => navigate('Numbers')} /></View>}
        {inbox.map(order => <View key={order.id} style={s.card}><View style={s.row}><Text style={[s.subtitle,{flex:1}]}>{order.service_name}</Text><View style={s.statusChip}><Text style={s.statusText}>{order.sms_code ? 'Code ready' : order.status === 'waiting_sms' ? 'Waiting' : order.status}</Text></View></View><Text style={s.text}>{order.country_name}</Text><Pressable accessibilityRole="button" accessibilityLabel={'Copy number ' + order.phone_number} onPress={() => void copy(order.phone_number)} style={s.copyRow}><Text selectable style={[s.number,{flex:1}]}>{order.phone_number}</Text><Icon name="copy-outline" size={20} /></Pressable><View style={s.otpBox}><Text style={s.label}>VERIFICATION CODE</Text><Text selectable style={s.code}>{order.sms_code || (order.status === 'waiting_sms' ? 'Waiting for SMS...' : 'No code received')}</Text>{order.sms_code && <Button secondary title="Copy code" onPress={() => void copy(order.sms_code!)} />}</View><Text style={s.caption}>Expires {new Date(order.expires_at).toLocaleTimeString()}</Text></View>)}
      </ScreenTransition>
      {visited.includes('Boost') && <ScreenTransition active={tab === 'Boost'}><Boost active={tab === 'Boost'} onOrdered={() => { navigate('Account'); void load() }} onSelect={() => scroll.current?.scrollTo({y:0,animated:!reduced})} /></ScreenTransition>}
      {visited.includes('Wallet') && <ScreenTransition active={tab === 'Wallet'}><Wallet userId={userId} onCredit={load} /></ScreenTransition>}
      <ScreenTransition active={tab === 'Account'}>
        <StepLabel title="Your account" detail={account?.profile.email || 'Loading your profile...'} />
        <View style={s.card}><Text style={s.subtitle}>Need a hand?</Text><Text style={s.text}>Get help with a payment or an order without leaving your details behind.</Text><Button secondary title="Message support" onPress={() => void Linking.openURL('https://wa.me/237677034736')} /></View>
        <Text style={s.subtitle}>Recent payments</Text>{!account?.transactions.length && <Text style={s.text}>Your payment history will appear here.</Text>}
        {account?.transactions.map(transaction => <View style={s.card} key={transaction.id}><View style={s.row}><Icon name={transaction.type === 'deposit' ? 'arrow-down-circle-outline' : 'receipt-outline'} color="#c2410c" /><Text style={[s.subtitle,{flex:1}]}>{transaction.type.replace(/_/g,' ')}</Text><Text style={s.subtitle}>{money(transaction.amount)}</Text></View><Text style={s.text}>{transaction.status}</Text><Text selectable style={s.caption}>{transaction.reference}</Text></View>)}
        <Text style={s.subtitle}>Social orders</Text>{account?.orders.map(order => <View style={s.card} key={order.id}><Text style={s.subtitle}>{order.service_name}</Text><Text style={s.text}>{order.quantity.toLocaleString()} units - {order.status}</Text></View>)}
        <Button secondary title="Sign out" onPress={() => void supabase?.auth.signOut()} />
      </ScreenTransition>
    </ScrollView>
    {!!copyNotice && <View accessibilityLiveRegion="polite" style={s.toast}><Text style={{color:'#fff',fontWeight:'700'}}>{copyNotice}</Text></View>}
    <View style={s.tabs}>{(['Numbers','Inbox','Boost','Wallet','Account'] as Tab[]).map(item => <Pressable key={item} onPress={() => navigate(item)} accessibilityRole="tab" accessibilityLabel={item === 'Inbox' && waiting ? 'Inbox, ' + waiting + ' numbers waiting' : item} accessibilityState={{ selected: tab === item }} style={s.tab}><View style={[s.tabIcon,tab === item && s.selected]}><Icon name={tabIcons[item]} color={tab === item ? '#9a3412' : '#64748b'} size={22} />{item === 'Inbox' && waiting > 0 && <View style={s.badge}><Text style={s.badgeText}>{Math.min(waiting,9)}</Text></View>}</View><Text style={[s.tabText,tab === item && {color:'#9a3412'}]}>{item}</Text></Pressable>)}</View>
  </View>
}
function Numbers({ onPurchased }: { onPurchased: () => void }) {
  const [catalog, setCatalog] = useState<{ countries: Choice[]; services: Choice[] }>({ countries: [], services: [] })
  const [country, setCountry] = useState('US'), [service, setService] = useState('wa')
  const [quote, setQuote] = useState<{ price_xaf: number; available: number } | null>(null)
  const [quoteVersion, setQuoteVersion] = useState(0)
  const [notice, setNotice] = useState(''), [busy, setBusy] = useState(false)
  const locked = useRef(false)
  useEffect(() => { void api<typeof catalog>('/api/mobile/sms/catalog').then(setCatalog).catch(error => setNotice(messageOf(error))) }, [quoteVersion])
  useEffect(() => {
    let stopped = false
    setQuote(null)
    setNotice('Checking current price and stock...')
    void api<{ price_xaf: number; available: number }>('/api/v1/sms/order', { action: 'quote', country, service }).then(result => { if (!stopped) { setQuote(result); setNotice('') } }).catch(error => { if (!stopped) setNotice(messageOf(error)) })
    return () => { stopped = true }
  }, [country, service, quoteVersion])
  const buy = () => {
    if (!quote || busy) return
    Alert.alert('Confirm number purchase', 'Wallet charge: ' + money(quote.price_xaf) + '. Price and stock are checked again before purchase.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Buy number', onPress: () => {
      if (locked.current) return
      locked.current = true
      setBusy(true)
      void api('/api/v1/sms/order', { action: 'getNumber', service, country }).then(onPurchased).catch(error => setNotice(messageOf(error) + ' Check your inbox and wallet before retrying.')).finally(() => { locked.current = false; setBusy(false) })
    } }])
  }
  return <><StepLabel title="Your next number" detail="Choose your app and country. We handle the rest." /><View style={s.stepBar}><Text style={s.stepActive}>1 Choose</Text><Text style={s.stepActive}>2 Review</Text><Text style={s.caption}>3 Receive code</Text></View><Text style={s.label}>Which app?</Text><Choices items={catalog.services} selected={service} onSelect={value => { if (!busy) setService(value) }} /><Text style={s.label}>Country</Text><Choices items={catalog.countries} selected={country} onSelect={value => { if (!busy) setCountry(value) }} /><View style={s.card}>{quote ? <View style={s.row}><View style={{flex:1}}><Text style={s.caption}>WALLET PRICE</Text><Text style={s.number}>{money(quote.price_xaf)}</Text></View><View style={s.statusChip}><Text style={s.statusText}>In stock</Text></View></View> : <Text style={s.text}>Checking availability...</Text>}<Button title={busy ? 'Getting your number...' : 'Review & buy number'} disabled={!quote || busy} onPress={buy} /><Text style={s.caption}>You confirm before we charge. Your code appears in Inbox.</Text>{!!notice && <Text accessibilityLiveRegion="polite" style={s.notice}>{notice}</Text>}{!quote && <Button secondary title="Check availability again" onPress={() => setQuoteVersion(value => value + 1)} />}</View></>
}
function Boost({ onOrdered, onSelect, active }: { onOrdered: () => void; onSelect: () => void; active: boolean }) {
  const [query, setQuery] = useState(''), [services, setServices] = useState<Service[]>([])
  const [platform, setPlatform] = useState(''), [limit, setLimit] = useState(12)
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<Service | null>(null)
  const [link, setLink] = useState(''), [quantity, setQuantity] = useState('1000')
  const [notice, setNotice] = useState(''), [busy, setBusy] = useState(false)
  const locked = useRef(false)
  useEffect(() => {
    if (!active) return
    let stopped = false
    const timer = setTimeout(() => {
      setLoading(true); setLimit(12)
      void api<{ services: Service[] }>('/api/v1/smm/services?category=' + encodeURIComponent(platform) + '&search=' + encodeURIComponent(query))
        .then(data => { if (!stopped) { setServices(data.services); setNotice('') } })
        .catch(error => { if (!stopped) setNotice(messageOf(error)) })
        .finally(() => { if (!stopped) setLoading(false) })
    }, 250)
    return () => { stopped = true; clearTimeout(timer) }
  }, [query, platform, active])
  const order = () => {
    if (!selected || busy || !/^https?:\/\//i.test(link) || !Number.isInteger(Number(quantity)) || Number(quantity) < selected.min || Number(quantity) > selected.max) { setNotice('Enter a valid link and quantity within the limits.'); return }
    Alert.alert('Confirm social order', 'Estimated wallet charge: ' + money(Math.ceil(selected.retail_rate_xaf * Number(quantity) / 1000)) + '. The current provider price is checked at checkout.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Place order', onPress: () => {
      if (locked.current) return
      locked.current = true
      setBusy(true)
      void api('/api/v1/smm/order', { service_id: selected.service_id || selected.id, link: link.trim(), quantity: Number(quantity) }).then(() => { setNotice('Order created. View its status in Account.'); onOrdered() }).catch(error => setNotice(messageOf(error) + ' Check your order history before retrying.')).finally(() => { setBusy(false); locked.current = false })
    } }])
  }
  return <><StepLabel title={selected ? 'Review your order' : 'Make your next move'} detail={selected ? 'Your price and limits, clearly shown before you buy.' : 'Pick a platform or search. No long menus to navigate.'} />
    {selected ? <View style={s.card}><Pressable accessibilityRole="button" onPress={() => { if (!busy) setSelected(null) }} style={s.back}><Icon name="arrow-back" color="#9a3412" size={18} /><Text style={s.link}>Choose another service</Text></Pressable><Text style={s.subtitle}>{selected.name}</Text><View style={s.priceBox}><Text style={s.caption}>RATE PER 1,000</Text><Text style={s.number}>{money(selected.retail_rate_xaf)}</Text><Text style={s.text}>Quantity {selected.min.toLocaleString()} to {selected.max.toLocaleString()}</Text></View><Text style={s.label}>Your post or profile link</Text><TextInput accessibilityLabel="Social profile or post link" editable={!busy} style={s.input} value={link} onChangeText={setLink} placeholder="https://..." autoCapitalize="none" keyboardType="url" /><Text style={s.label}>Quantity</Text><TextInput accessibilityLabel="Order quantity" editable={!busy} style={s.input} value={quantity} onChangeText={setQuantity} keyboardType="number-pad" /><View style={s.row}><Text style={[s.text,{flex:1}]}>Estimated total</Text><Text style={s.subtitle}>{money(Math.ceil(selected.retail_rate_xaf * (Number(quantity) || 0) / 1000))}</Text></View><Button title={busy ? 'Placing your order...' : 'Review & place order'} disabled={busy} onPress={order} /><Text style={s.caption}>The current price is checked again before charging your wallet.</Text></View>
    : <><TextInput accessibilityLabel="Search social services" style={s.input} placeholder="Search views, likes, followers..." value={query} onChangeText={setQuery} returnKeyType="search" /><Choices items={[{code:'',name:'All'},{code:'TikTok',name:'TikTok'},{code:'Instagram',name:'Instagram'},{code:'Telegram',name:'Telegram'},{code:'YouTube',name:'YouTube'},{code:'Facebook',name:'Facebook'}]} selected={platform} onSelect={setPlatform} />{loading && <Text accessibilityLiveRegion="polite" style={s.text}>Finding your services...</Text>}{!loading && !services.length && <View style={s.empty}><Icon name="search-outline" size={32} /><Text style={s.subtitle}>No matching services</Text><Text style={s.text}>Try a different platform or search word.</Text></View>}{services.slice(0,limit).map(item => <Pressable accessibilityRole="button" key={item.service_id || item.id} style={s.card} onPress={() => { setSelected(item); setQuantity(String(item.min)); onSelect() }}><Text style={s.caption}>{item.category}</Text><Text style={s.subtitle}>{item.name}</Text><View style={s.row}><Text style={[s.retail,{flex:1}]}>{money(item.retail_rate_xaf)} / 1,000</Text><Icon name="arrow-forward-circle" color="#c2410c" size={28} /></View></Pressable>)}{services.length > limit && <Button secondary title="Show more services" onPress={() => setLimit(value => value + 12)} />}</>}
    {!!notice && <Text accessibilityLiveRegion="polite" style={s.notice}>{notice}</Text>}
  </>
}
function Wallet({ userId, onCredit }: { userId: string; onCredit: () => void }) {
  const [amount, setAmount] = useState('5000'), [phone, setPhone] = useState('')
  const [method, setMethod] = useState('mtn_momo')
  const [reference, setReference] = useState(''), [notice, setNotice] = useState(''), [status, setStatus] = useState('ready')
  const [busy, setBusy] = useState(true)
  const locked = useRef(false)
  const requestKey = useRef('')
  const storageKey = 'pv-payment.' + userId
  useEffect(() => {
    let stopped = false
    void SecureStore.getItemAsync(storageKey).then(value => {
      if (!stopped && value) { const record = JSON.parse(value); requestKey.current = record.key; setReference(record.reference); setStatus('pending'); setNotice('Checking your previous payment. Do not pay again yet.') }
    }).catch(() => { if (!stopped) setNotice('Could not restore the last payment. Check your wallet history before paying again.') }).finally(() => { if (!stopped) setBusy(false) })
    return () => { stopped = true }
  }, [storageKey])
  useEffect(() => {
    if (!reference || status !== 'pending') return
    let stopped = false, attempts = 0
    let timer: ReturnType<typeof setTimeout>
    const check = async () => {
      if (stopped) return
      if (AppState.currentState !== 'active') { timer = setTimeout(check, 5000); return }
      try {
        const result = await api<{ status: string; amount_xaf: number }>('/api/payments/payunit?ref=' + encodeURIComponent(reference))
        if (stopped) return
        if (Number.isFinite(result.amount_xaf)) setAmount(String(result.amount_xaf))
        if (result.status === 'completed') { setStatus('completed'); setNotice('Confirmed. Your wallet is credited.'); onCredit(); return }
        if (result.status === 'failed') { setStatus('failed'); setNotice('Payment was not completed. Check your operator balance before starting another.'); return }
        setNotice('Approve on your phone. Never enter your PIN in this app.')
      } catch (error) { if (!stopped) setNotice(messageOf(error) + ' Check your payment history before paying again.') }
      if (!stopped && ++attempts < 120) timer = setTimeout(check, 5000)
    }
    void check()
    return () => { stopped = true; clearTimeout(timer) }
  }, [reference, status, onCredit])
  const pay = async () => {
    if (locked.current || busy || status === 'pending') return
    const digits = phone.replace(/[^0-9]/g, '').replace(/^00237|^237/, '')
    if (!/^6\d{8}$/.test(digits) || !Number.isInteger(Number(amount)) || Number(amount) < 3000 || Number(amount) > 10000000) { setNotice('Enter your Cameroon phone number and 3,000–10,000,000 XAF.'); return }
    locked.current = true; setBusy(true)
    requestKey.current ||= Crypto.randomUUID()
    const expectedRef = 'PV' + requestKey.current.replace(/-/g, '')
    try {
      // Persist before sending so a closed app can recover the same reference.
      await SecureStore.setItemAsync(storageKey, JSON.stringify({ key: requestKey.current, reference: expectedRef }))
      setReference(expectedRef); setStatus('pending')
      const result = await api<{ reference: string; status: string }>('/api/payments/payunit', { amount: Number(amount), currency: 'XAF', phone_number: phone, payment_method: method, idempotency_key: requestKey.current, accepted_fee_percent: 0 })
      setReference(result.reference); setStatus(result.status)
      setNotice('Check your phone for approval. We verify the payment before adding funds.')
    } catch (error) { setNotice(messageOf(error) + ' Check your payment history before starting another request.') } finally { setBusy(false); locked.current = false }
  }
  const reset = () => Alert.alert('Start another payment?', 'Only continue after checking your wallet and operator account. A previous pending transfer may still complete.', [{ text: 'Cancel', style: 'cancel' }, { text: 'I checked — continue', onPress: () => { void SecureStore.deleteItemAsync(storageKey).then(() => { requestKey.current = ''; setReference(''); setStatus('ready'); setNotice('') }).catch(error => setNotice(messageOf(error))) } }])
  return <><StepLabel title="A little fuel for your next move" detail="Top up once. Get numbers and place orders from one wallet." /><Text style={s.text}>Minimum 3,000 XAF wallet credit. No platform top-up fee for MTN or Orange; operator fees are separate. Approve on your phone; we never ask for your PIN.</Text><View style={s.card}><Text style={s.label}>Amount (XAF)</Text><TextInput editable={!busy && status !== 'pending'} style={s.input} keyboardType="number-pad" value={amount} onChangeText={setAmount} /><Choices items={[3000,5000,10000,25000].map(value => ({code:String(value),name:money(value)}))} selected={amount} onSelect={value => { if (!busy && status !== 'pending') setAmount(value) }} /><Choices items={[{code:'mtn_momo',name:'MTN MoMo'},{code:'orange_money',name:'Orange Money'}]} selected={method} onSelect={value => { if (!busy && status !== 'pending') setMethod(value) }} /><Text style={s.text}>Wallet credit: {money(Number(amount))}. Platform fee: {money(0)}. Total payment: {money(Number(amount))}.</Text><Button secondary title="No convenient method? WhatsApp support" onPress={() => void Linking.openURL('https://wa.me/237677034736')} /><Text style={s.label}>Your mobile-money number</Text><TextInput editable={!busy && status !== 'pending'} style={s.input} keyboardType="phone-pad" placeholder="+237 6XX XXX XXX" value={phone} onChangeText={setPhone} /><Button title={busy ? 'Please wait...' : status === 'pending' ? 'Waiting for confirmation' : status === 'completed' ? 'Wallet credited' : 'Send payment request'} disabled={busy || status === 'pending' || status === 'completed' || status === 'failed'} onPress={() => void pay()} />{!!notice && <Text accessibilityLiveRegion="polite" style={s.notice}>{notice}</Text>}{!!reference && <><Text selectable style={s.text}>Reference: {reference}</Text><Button title="Start a new payment (check previous first)" disabled={busy} onPress={reset} /></>}</View></>
}
const s = StyleSheet.create({
  safe: {flex:1,backgroundColor:'#f5f7fb'}, fill:{flex:1}, content:{padding:20,gap:16,paddingBottom:32},
  header:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',padding:18,backgroundColor:'#fff',gap:10,borderBottomWidth:1,borderColor:'#edf0f5'},
  brand:{fontSize:11,fontWeight:'900',color:'#c2410c',letterSpacing:1.6}, greeting:{fontSize:18,fontWeight:'800',color:'#10233f',marginTop:4},
  title:{fontSize:28,fontWeight:'800',color:'#10233f',letterSpacing:-0.6}, subtitle:{fontSize:16,fontWeight:'700',color:'#10233f',lineHeight:23},
  text:{fontSize:14,color:'#52647a',lineHeight:22}, caption:{fontSize:11,color:'#52647a',lineHeight:17,fontWeight:'600'},
  sectionHeading:{gap:6,marginBottom:4}, balance:{fontSize:13,fontWeight:'800',color:'#1d4ed8'}, walletBadge:{minHeight:48,flexDirection:'row',alignItems:'center',gap:7,padding:12,borderRadius:16,backgroundColor:'#eff6ff'},
  card:{backgroundColor:'#fff',borderRadius:24,borderWidth:1,borderColor:'#e3e9f2',padding:20,gap:14},
  label:{fontSize:13,color:'#334155',fontWeight:'800'}, input:{minHeight:52,borderWidth:1,borderColor:'#cbd5e1',backgroundColor:'#fff',borderRadius:16,padding:16,fontSize:16,color:'#10233f'},
  notice:{backgroundColor:'#eff6ff',color:'#1e40af',padding:16,borderRadius:16,lineHeight:22}, link:{color:'#9a3412',fontWeight:'800'},
  choiceGrid:{flexDirection:'row',flexWrap:'wrap',gap:8}, chip:{minHeight:48,paddingHorizontal:14,paddingVertical:12,borderRadius:14,backgroundColor:'#fff',borderWidth:1,borderColor:'#e3e9f2',flexDirection:'row',alignItems:'center',gap:7}, chipText:{color:'#334155',fontWeight:'700',fontSize:13}, selected:{backgroundColor:'#ffedd5',borderColor:'#fdba74'},
  number:{fontSize:23,fontWeight:'800',color:'#10233f'}, code:{fontSize:25,fontWeight:'800',color:'#166534'}, row:{flexDirection:'row',alignItems:'center',gap:10},
  otpBox:{gap:10,borderRadius:18,padding:18,backgroundColor:'#f0fdf4'}, copyRow:{minHeight:48,flexDirection:'row',alignItems:'center',gap:10},
  statusChip:{borderRadius:20,paddingHorizontal:10,paddingVertical:6,backgroundColor:'#f0fdf4'}, statusText:{color:'#166534',fontSize:11,fontWeight:'800'},
  empty:{gap:12,padding:26,borderRadius:24,backgroundColor:'#fff',borderWidth:1,borderColor:'#e3e9f2'}, stepBar:{flexDirection:'row',justifyContent:'space-between',gap:6,backgroundColor:'#fff',padding:14,borderRadius:16}, stepActive:{fontSize:11,fontWeight:'800',color:'#9a3412'},
  priceBox:{gap:6,padding:16,borderRadius:18,backgroundColor:'#fff7ed'}, retail:{color:'#9a3412',fontWeight:'800',fontSize:14}, back:{minHeight:48,flexDirection:'row',alignItems:'center',gap:8},
  toast:{position:'absolute',bottom:84,left:20,right:20,padding:16,borderRadius:16,backgroundColor:'#10233f'},
  tabs:{flexDirection:'row',backgroundColor:'#fff',paddingHorizontal:6,paddingTop:8,paddingBottom:6,borderTopWidth:1,borderColor:'#e3e9f2'}, tab:{flex:1,minHeight:60,alignItems:'center',justifyContent:'center',gap:5}, tabText:{fontSize:10,fontWeight:'700',color:'#52647a'}, tabIcon:{paddingHorizontal:16,paddingVertical:5,borderRadius:20}, badge:{position:'absolute',right:6,top:0,backgroundColor:'#c2410c',borderRadius:10,minWidth:16,paddingHorizontal:3,alignItems:'center'}, badgeText:{fontSize:9,fontWeight:'800',color:'#fff'},
})
