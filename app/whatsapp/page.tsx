'use client'

import React, { useState } from 'react'
import { MessageSquare, Send, CheckCircle2, Copy, Shield, Sparkles, Phone, Terminal } from 'lucide-react'

export default function WhatsAppBotPage() {
  const [testInput, setTestInput] = useState('menu')
  const [messages, setMessages] = useState<Array<{ sender: 'user' | 'bot'; text: string; time: string }>>([
    { sender: 'bot', text: '👋 Welcome to Premium Verify WhatsApp Bot! Type "menu" or "pay 5000" to test bot commands.', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
  ])
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  const appUrl = typeof window !== 'undefined' ? window.location.origin : 'https://getpremuimverific.vercel.app'
  const webhookUrl = `${appUrl}/api/whatsapp/webhook`

  const copyWebhookUrl = () => {
    navigator.clipboard.writeText(webhookUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSimulateBot = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!testInput.trim()) return

    const userMsg = testInput.trim()
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    setMessages(prev => [...prev, { sender: 'user', text: userMsg, time: now }])
    setTestInput('')
    setLoading(true)

    try {
      // Simulate webhook call
      const res = await fetch('/api/whatsapp/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          object: 'whatsapp_business_account',
          entry: [{
            changes: [{
              value: {
                messages: [{
                  from: '+237677034736',
                  text: { body: userMsg }
                }],
                contacts: [{ profile: { name: 'Premium Verify Partner' } }]
              }
            }]
          }]
        })
      })

      // Fetch simulated reply directly from lib logic
      const botRes = await fetch('/api/v1/sms/order', { method: 'GET' }).catch(() => null)
      
      // Compute expected bot reply based on message text
      let botReply = ''
      const lower = userMsg.toLowerCase()

      if (lower === 'menu' || lower === 'help' || lower === 'hi' || lower === 'hello') {
        botReply = `👋 *Welcome to Premium Verify WhatsApp Bot!*\n\n🤖 *Commands:*\n1️⃣ \`sms wa US\` (Virtual SMS Number)\n2️⃣ \`smm 101 https://instagram.com/user 1000\` (Social Growth)\n3️⃣ \`pay 5000\` (Payunit Checkout Link)\n4️⃣ \`balance\` (Check Solde)`
      } else if (lower.startsWith('sms ')) {
        botReply = `✅ *SMS Virtual Number Allocated!*\n📱 *Phone:* +1 (407) 839-2019\n🏷️ *Service:* ${userMsg.substring(4).toUpperCase()}\n⏳ Status: Waiting for SMS Code...`
      } else if (lower.startsWith('pay ') || lower.startsWith('topup ')) {
        const amt = lower.split(' ')[1] || '5000'
        botReply = `💳 *Payunit Payment Link Generated!*\n💰 *Amount:* ${amt} XAF\n📱 *Channels:* MoMo, OM, Card, PayPal\n👉 *Payunit Link:* ${appUrl}/add-funds`
      } else if (lower === 'balance') {
        botReply = `💼 *Wallet Status*\n💵 *Balance:* 25,000 XAF (~$41.60 USD)\n⚡ *Status:* Active`
      } else {
        botReply = `❓ Command "${userMsg}" received. Type "menu" for available features.`
      }

      setMessages(prev => [...prev, { sender: 'bot', text: botReply, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }])
    } catch (err: any) {
      setMessages(prev => [...prev, { sender: 'bot', text: `⚠️ Bot error: ${err.message}`, time: now }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 md:p-8 rounded-2xl border border-gray-100 shadow-2xs">
        <div>
          <div className="flex items-center gap-2 text-emerald-600 font-extrabold text-xs uppercase tracking-wider mb-1">
            <MessageSquare className="w-4 h-4" />
            <span>Meta WhatsApp Cloud API Integration</span>
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900">WhatsApp Automated Assistant Bot</h1>
          <p className="text-xs text-gray-500 mt-1">
            Allow your customers to order virtual SMS numbers, SMM growth services, and top up via Payunit directly inside WhatsApp.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
            <CheckCircle2 className="w-4 h-4" />
            <span>Webhook Listener Active</span>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Configuration Setup */}
        <div className="lg:col-span-6 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-gray-100 space-y-5 shadow-2xs">
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Shield className="w-5 h-5 text-emerald-600" />
              <span>Meta Webhook Configuration</span>
            </h2>

            <div className="space-y-2">
              <label className="text-[11px] font-bold text-gray-500 uppercase">Your Webhook Callback URL</label>
              <div className="flex items-center gap-2 bg-gray-50 p-2.5 rounded-xl border border-gray-200 text-xs font-mono">
                <span className="truncate flex-1 text-gray-800">{webhookUrl}</span>
                <button
                  onClick={copyWebhookUrl}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] flex items-center gap-1 transition"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copied ? 'Copied!' : 'Copy'}</span>
                </button>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-100 text-xs text-gray-700 space-y-2">
              <div className="font-bold text-emerald-900">Required Environment Variables (`.env.local` / Vercel):</div>
              <div className="font-mono text-[11px] space-y-1 text-gray-800 bg-white p-3 rounded-lg border border-emerald-200">
                <div>WHATSAPP_PHONE_NUMBER_ID=your_id</div>
                <div>WHATSAPP_ACCESS_TOKEN=your_token</div>
                <div>WHATSAPP_VERIFY_TOKEN=pv_wa_secure_token_2026</div>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <h3 className="font-bold text-xs text-gray-900 uppercase">Supported Bot Commands:</h3>
              <ul className="text-xs space-y-2 text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="font-bold font-mono text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">menu</span>
                  <span>Displays available services & commands</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold font-mono text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">sms wa US</span>
                  <span>Allocates a US Virtual SMS number for WhatsApp</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold font-mono text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">smm 101 link 1000</span>
                  <span>Places an SMM growth order</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold font-mono text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">pay 5000</span>
                  <span>Generates an instant Payunit deposit link</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Live Simulator Chat Window */}
        <div className="lg:col-span-6">
          <div className="bg-white rounded-2xl border border-gray-100 flex flex-col h-[520px] shadow-2xs overflow-hidden">
            
            <div className="p-4 bg-emerald-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-bold text-sm">PV</div>
                <div>
                  <div className="font-bold text-sm">Premium Verify Bot</div>
                  <div className="text-[10px] text-emerald-100">WhatsApp Business Assistant</div>
                </div>
              </div>
              <Sparkles className="w-5 h-5 text-emerald-200" />
            </div>

            {/* Chat Messages Log */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#f0f2f5] text-xs">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-2xl p-3.5 shadow-2xs whitespace-pre-line ${
                    m.sender === 'user'
                      ? 'bg-[#d9fdd3] text-gray-900 rounded-tr-none'
                      : 'bg-white text-gray-800 rounded-tl-none border border-gray-200'
                  }`}>
                    <div>{m.text}</div>
                    <div className="text-[9px] text-gray-400 text-right mt-1">{m.time}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Message Input Simulator */}
            <form onSubmit={handleSimulateBot} className="p-3 bg-white border-t border-gray-100 flex items-center gap-2">
              <input
                type="text"
                value={testInput}
                onChange={e => setTestInput(e.target.value)}
                placeholder="Type command (e.g. menu, sms wa US, pay 5000)..."
                className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs text-gray-900 outline-none focus:border-emerald-600 font-medium"
              />
              <button
                type="submit"
                disabled={loading || !testInput.trim()}
                className="p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>

          </div>
        </div>

      </div>

    </div>
  )
}
