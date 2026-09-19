'use client'

import React, { useState } from 'react'
import { Bot, Send, User, Sparkles, HelpCircle, Smartphone, Share2, ShieldAlert } from 'lucide-react'

interface Message {
  id: string
  sender: 'user' | 'ai'
  text: string
  timestamp: string
}

export default function AIAssistantPage() {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      sender: 'ai',
      text: 'Welcome to Premium Verify AI Assistant! How can I help you today? Ask me about SMM panel services, YouTube monetization packages, Facebook rescue & recovery, or virtual SMS numbers!',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ])
  const [isThinking, setIsThinking] = useState(false)

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return

    const userMsg: Message = {
      id: Math.random().toString(),
      sender: 'user',
      text: input,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }

    setMessages(prev => [...prev, userMsg])
    const promptText = input
    setInput('')
    setIsThinking(true)

    setTimeout(() => {
      let aiReply = 'I am your Premium Verify AI assistant. You can also reach our direct human support team on WhatsApp (+237 680209047) or email hello@premiumverific.com.'

      const lower = promptText.toLowerCase()
      if (lower.includes('number') || lower.includes('sms') || lower.includes('code') || lower.includes('whatsapp') || lower.includes('telegram')) {
        aiReply = 'To get a virtual SMS number:\n1. Go to "Get Number" from the sidebar menu.\n2. Choose your platform (e.g. WhatsApp, Telegram, TikTok).\n3. Choose your preferred country (e.g. USA, UK, Cameroon, France).\n4. Click "Get Code". Your virtual number will generate instantly with a live SMS code monitor!'
      } else if (lower.includes('smm') || lower.includes('follower') || lower.includes('view') || lower.includes('like') || lower.includes('monetization')) {
        aiReply = 'Our SMM Panel is synchronized directly with JustAnotherPanel API v2. We offer high retention YouTube views, organic Instagram followers, TikTok viral views, and complete YouTube/Facebook monetization packages. Navigate to "SMM Panel" to place your order!'
      } else if (lower.includes('facebook') || lower.includes('rescue') || lower.includes('hack') || lower.includes('recover')) {
        aiReply = 'For Facebook Account Rescue & Recovery:\nOur technical team assists in restoring hacked, locked, or 2FA-blocked Facebook profiles and pages. Visit the "Accounts" section and select "Facebook Hacking & Rescue Recovery Service" to submit your recovery request.'
      } else if (lower.includes('deposit') || lower.includes('momo') || lower.includes('orange') || lower.includes('pay') || lower.includes('money')) {
        aiReply = 'You can top up your wallet instantly using MTN Mobile Money, Orange Money, Visa/Mastercard, or USDT Crypto. Click the "+" button beside your balance in the sidebar!'
      }

      const aiMsg: Message = {
        id: Math.random().toString(),
        sender: 'ai',
        text: aiReply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }

      setMessages(prev => [...prev, aiMsg])
      setIsThinking(false)
    }, 1000)
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-extrabold text-gray-900 flex items-center gap-3">
          <Bot className="w-8 h-8 text-[#ff6b00]" />
          <span>AI Support Assistant</span>
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Ask questions about virtual phone numbers, SMM panel services, account recovery, or payment methods.
        </p>
      </div>

      {/* Suggested Quick Question Pills */}
      <div className="flex flex-wrap gap-2">
        {[
          'How do I receive SMS code for WhatsApp?',
          'How does YouTube monetization package work?',
          'How to recover a hacked Facebook account?',
          'How to deposit with MTN MoMo or Orange Money?'
        ].map(q => (
          <button
            key={q}
            onClick={() => setInput(q)}
            className="px-3 py-1.5 rounded-xl bg-white border border-gray-200 hover:border-[#ff6b00]/40 text-xs text-gray-700 shadow-xs transition"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Chat Box */}
      <div className="agoverify-card p-6 flex flex-col h-[520px]">
        
        {/* Messages list */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-2">
          {messages.map(msg => (
            <div
              key={msg.id}
              className={`flex gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.sender === 'ai' && (
                <div className="w-8 h-8 rounded-xl bg-orange-100 text-[#ff6b00] flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={`max-w-lg p-4 rounded-2xl text-xs leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-[#ff6b00] text-white font-semibold rounded-tr-none shadow-xs'
                    : 'bg-gray-50 text-gray-800 border border-gray-200 rounded-tl-none whitespace-pre-line'
                }`}
              >
                {msg.text}
                <div className={`text-[9px] mt-2 ${msg.sender === 'user' ? 'text-white/80' : 'text-gray-400'}`}>
                  {msg.timestamp}
                </div>
              </div>

              {msg.sender === 'user' && (
                <div className="w-8 h-8 rounded-xl bg-gray-200 text-gray-700 flex items-center justify-center shrink-0">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          ))}

          {isThinking && (
            <div className="flex gap-3 items-center text-xs text-[#ea580c]">
              <Bot className="w-4 h-4 animate-bounce" />
              <span>Premium Verify AI is generating response...</span>
            </div>
          )}
        </div>

        {/* Input form */}
        <form onSubmit={handleSend} className="mt-4 pt-4 border-t border-gray-100 flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1 bg-white border border-gray-300 focus:border-[#ff6b00] rounded-xl py-3 px-4 text-gray-900 text-xs outline-none"
            placeholder="Type your question here..."
          />
          <button
            type="submit"
            className="px-5 py-3 rounded-xl bg-[#ff6b00] hover:bg-[#ea580c] text-white font-extrabold text-xs transition flex items-center gap-2 shadow-xs"
          >
            <Send className="w-4 h-4" />
            <span>Send</span>
          </button>
        </form>

      </div>
    </div>
  )
}
