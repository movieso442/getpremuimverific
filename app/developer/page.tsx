'use client'

import React, { useState } from 'react'
import {
  Code2,
  Key,
  Webhook,
  Plus,
  Copy,
  Check,
  Trash2,
  BookOpen,
  Eye,
  EyeOff,
  CheckSquare,
  Square,
  Terminal,
  ShieldCheck
} from 'lucide-react'
import { useAppState } from '@/lib/store'

export default function DeveloperPage() {
  const { apiKeys, webhooks, addApiKey, deleteApiKey, addWebhook, deleteWebhook } = useAppState()

  // API Key creation
  const [keyNameInput, setKeyNameInput] = useState('')
  const [revealedKeyId, setRevealedKeyId] = useState<string | null>(null)
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null)

  // Webhook creation
  const [webhookUrlInput, setWebhookUrlInput] = useState('')
  const [selectedEvents, setSelectedEvents] = useState<string[]>(['order.created', 'sms.received'])

  // Active Tab
  const [activeTab, setActiveTab] = useState<'management' | 'docs'>('management')

  const toggleEvent = (evt: string) => {
    if (selectedEvents.includes(evt)) {
      setSelectedEvents(selectedEvents.filter(e => e !== evt))
    } else {
      setSelectedEvents([...selectedEvents, evt])
    }
  }

  const [devMsg, setDevMsg] = useState<string | null>(null)

  const handleCreateApiKey = (e: React.FormEvent) => {
    e.preventDefault()
    setDevMsg(null)
    if (!keyNameInput.trim()) {
      setDevMsg('Please enter a key name (e.g., Production API Key)')
      return
    }
    const created = addApiKey(keyNameInput)
    setKeyNameInput('')
    setRevealedKeyId(created.id)
  }

  const handleAddWebhook = (e: React.FormEvent) => {
    e.preventDefault()
    setDevMsg(null)
    if (!webhookUrlInput.trim()) {
      setDevMsg('Please enter a valid webhook target URL')
      return
    }
    addWebhook(webhookUrlInput, selectedEvents)
    setWebhookUrlInput('')
    setDevMsg('Webhook endpoint registered successfully!')
  }

  const handleCopyKey = (keyString: string, id: string) => {
    navigator.clipboard.writeText(keyString)
    setCopiedKeyId(id)
    setTimeout(() => setCopiedKeyId(null), 2000)
  }

  return (
    <div className="space-y-8">
      {devMsg && (
        <div className="p-4 rounded-xl bg-orange-50 border border-orange-200 text-xs font-bold text-[#ea580c] flex items-center justify-between">
          <span>{devMsg}</span>
          <button onClick={() => setDevMsg(null)} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>
      )}

      {/* Title Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900">Developer & API Keys</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage API keys and webhooks for building with Premium Verify.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('management')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition ${
              activeTab === 'management' ? 'bg-[#ff6b00] text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Keys & Webhooks
          </button>
          <button
            onClick={() => setActiveTab('docs')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition ${
              activeTab === 'docs' ? 'bg-[#ff6b00] text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            API Reference Docs
          </button>
        </div>
      </div>

      {activeTab === 'management' ? (
        /* 2 COLUMN LAYOUT */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* CARD 1: API KEYS */}
          <div className="agoverify-card p-6 md:p-8 space-y-6">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Key className="w-5 h-5 text-[#ff6b00]" />
              <span>API Keys</span>
            </h2>

            <form onSubmit={handleCreateApiKey} className="flex gap-3">
              <input
                type="text"
                value={keyNameInput}
                onChange={(e) => setKeyNameInput(e.target.value)}
                className="flex-1 bg-white border border-gray-300 focus:border-[#ff6b00] rounded-xl py-3 px-4 text-gray-900 text-sm outline-none"
                placeholder="Key name (e.g. Production)"
              />
              <button
                type="submit"
                className="px-5 py-3 rounded-xl bg-[#ff6b00] hover:bg-[#ea580c] text-white font-extrabold text-xs transition shadow-xs whitespace-nowrap"
              >
                Create Key
              </button>
            </form>

            {/* Keys List */}
            {apiKeys.length === 0 ? (
              <div className="py-8 text-center text-gray-400 text-xs">
                No API keys yet.
              </div>
            ) : (
              <div className="space-y-3">
                {apiKeys.map(k => (
                  <div key={k.id} className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-gray-900 text-xs">{k.key_name}</span>
                      <button
                        onClick={() => deleteApiKey(k.id)}
                        className="text-red-600 hover:text-red-700 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between gap-2 font-mono text-xs text-[#ea580c] bg-white p-2.5 rounded-lg border border-gray-200">
                      <span className="truncate">
                        {revealedKeyId === k.id ? k.api_key : k.key_prefix}
                      </span>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => setRevealedKeyId(revealedKeyId === k.id ? null : k.id)}
                          className="p-1 text-gray-500 hover:text-gray-900 transition"
                        >
                          {revealedKeyId === k.id ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => handleCopyKey(k.api_key, k.id)}
                          className="p-1 text-gray-500 hover:text-gray-900 transition"
                        >
                          {copiedKeyId === k.id ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Instruction Tip Box */}
            <div className="p-4 rounded-xl bg-orange-50 border border-orange-200 text-xs text-gray-700 space-y-2">
              <p>
                Send your API key in the <code className="text-[#ea580c] font-mono font-bold">X-API-Key</code> header or as a <code className="text-[#ea580c] font-mono font-bold">Bearer</code> token.
              </p>
              <button
                onClick={() => setActiveTab('docs')}
                className="text-[#ea580c] font-bold underline text-xs"
              >
                View API docs →
              </button>
            </div>
          </div>

          {/* CARD 2: WEBHOOK ENDPOINTS */}
          <div className="agoverify-card p-6 md:p-8 space-y-6">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Webhook className="w-5 h-5 text-[#ff6b00]" />
              <span>Webhook Endpoints</span>
            </h2>

            <form onSubmit={handleAddWebhook} className="space-y-4">
              <input
                type="url"
                value={webhookUrlInput}
                onChange={(e) => setWebhookUrlInput(e.target.value)}
                className="w-full bg-white border border-gray-300 focus:border-[#ff6b00] rounded-xl py-3 px-4 text-gray-900 text-sm outline-none"
                placeholder="https://yourdomain.com/webhook"
              />

              {/* Event Checkboxes */}
              <div className="flex flex-wrap gap-3">
                {['order.created', 'sms.received', 'order.cancelled', 'order.expired'].map(evt => {
                  const isChecked = selectedEvents.includes(evt)
                  return (
                    <button
                      key={evt}
                      type="button"
                      onClick={() => toggleEvent(evt)}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-mono font-semibold flex items-center gap-2 transition ${
                        isChecked
                          ? 'bg-orange-50 border-orange-300 text-[#ea580c]'
                          : 'bg-white border-gray-200 text-gray-600'
                      }`}
                    >
                      {isChecked ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                      <span>{evt}</span>
                    </button>
                  )
                })}
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-[#ff6b00] hover:bg-[#ea580c] text-white font-extrabold text-xs transition shadow-xs"
              >
                Add Webhook
              </button>
            </form>

            {/* Webhooks List */}
            {webhooks.length === 0 ? (
              <div className="py-8 text-center text-gray-400 text-xs">
                No webhooks yet.
              </div>
            ) : (
              <div className="space-y-3">
                {webhooks.map(wh => (
                  <div key={wh.id} className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-gray-900 text-xs truncate max-w-xs">{wh.url}</span>
                      <button
                        onClick={() => deleteWebhook(wh.id)}
                        className="text-red-600 hover:text-red-700 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex items-center gap-2 text-[10px] text-gray-500 font-mono">
                      <span>Events: {wh.events.join(', ')}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      ) : (
        /* REST API DOCUMENTATION VIEW */
        <div className="agoverify-card p-6 md:p-8 space-y-6">
          <div className="flex items-center justify-between border-b border-gray-200 pb-4">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Terminal className="w-5 h-5 text-[#ff6b00]" />
              <span>Premium Verify REST API v1 Specification</span>
            </h2>
            <span className="text-xs text-[#ea580c] font-mono">Base URL: https://premiumverific.com/api/v1</span>
          </div>

          <div className="space-y-6">
            
            {/* Endpoint 1: Get SMM Services */}
            <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-3">
              <div className="flex items-center gap-3">
                <span className="px-2.5 py-1 rounded bg-blue-600 text-white font-extrabold text-xs">GET</span>
                <span className="font-mono text-sm font-bold text-gray-900">/api/v1/smm/services</span>
              </div>
              <p className="text-xs text-gray-600">Retrieve all available JustAnotherPanel SMM services and rates in XAF.</p>
              
              <div className="bg-white p-3 rounded-lg border border-gray-200 font-mono text-xs text-[#ea580c]">
                curl -H "X-API-Key: YOUR_API_KEY" https://premiumverific.com/api/v1/smm/services
              </div>
            </div>

            {/* Endpoint 2: Order Virtual Number */}
            <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-3">
              <div className="flex items-center gap-3">
                <span className="px-2.5 py-1 rounded bg-[#ff6b00] text-white font-extrabold text-xs">POST</span>
                <span className="font-mono text-sm font-bold text-gray-900">/api/v1/sms/order</span>
              </div>
              <p className="text-xs text-gray-600">Request a new virtual phone number for instant SMS activation.</p>

              <div className="bg-white p-3 rounded-lg border border-gray-200 font-mono text-xs text-[#ea580c]">
                {`curl -X POST https://premiumverific.com/api/v1/sms/order \\
  -H "X-API-Key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"service": "wa", "country": "US"}'`}
              </div>
            </div>

            {/* Endpoint 3: Create SMM Order */}
            <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-3">
              <div className="flex items-center gap-3">
                <span className="px-2.5 py-1 rounded bg-[#ff6b00] text-white font-extrabold text-xs">POST</span>
                <span className="font-mono text-sm font-bold text-gray-900">/api/v1/smm/order</span>
              </div>
              <p className="text-xs text-gray-600">Submit an SMM panel order for followers, views, or monetization.</p>

              <div className="bg-white p-3 rounded-lg border border-gray-200 font-mono text-xs text-[#ea580c]">
                {`curl -X POST https://premiumverific.com/api/v1/smm/order \\
  -H "X-API-Key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"service_id": 101, "link": "https://instagram.com/p/xxx", "quantity": 1000}'`}
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  )
}
