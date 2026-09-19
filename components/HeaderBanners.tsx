'use client'

import React, { useState } from 'react'
import { Bell, X, MessageSquare } from 'lucide-react'

export const HeaderBanners: React.FC = () => {
  const [showTopBanner, setShowTopBanner] = useState(true)
  const [showPushBanner, setShowPushBanner] = useState(true)
  const [pushAllowed, setPushAllowed] = useState(false)

  const handleAllowPush = () => {
    setPushAllowed(true)
    setTimeout(() => {
      setShowPushBanner(false)
    }, 1200)
  }

  return (
    <>
      {/* Top Floating Community Banner */}
      {showTopBanner && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-40 w-full max-w-xl px-4 animate-in slide-in-from-top duration-300">
          <div className="bg-white border border-gray-200 rounded-2xl shadow-xl p-3 flex items-center justify-between text-gray-900">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#ff6b00] flex items-center justify-center text-white font-bold shrink-0">
                <MessageSquare className="w-5 h-5 fill-current" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-gray-900">Join Premium Verify Community</h4>
                <p className="text-[11px] text-gray-500">Support: +237 680209047 • hello@premiumverific.com</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <a
                href="https://wa.me/237680209047"
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 rounded-xl bg-[#25D366] hover:bg-[#20ba5a] text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition"
              >
                <span>Join WhatsApp</span>
              </a>
              <button
                onClick={() => setShowTopBanner(false)}
                className="w-7 h-7 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-700 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Floating Push Notifications Prompt */}
      {showPushBanner && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-full max-w-lg px-4 animate-in slide-in-from-bottom duration-300">
          <div className="bg-white border border-gray-200 rounded-2xl shadow-2xl p-3.5 flex items-center justify-between text-gray-900">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#2563eb] flex items-center justify-center shrink-0">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-gray-900">Enable Push Notifications</h4>
                <p className="text-[11px] text-gray-500">Get instant alerts for SMS codes, SMM status & broadcasts</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleAllowPush}
                className={`px-4 py-1.5 rounded-xl font-bold text-xs transition ${
                  pushAllowed
                    ? 'bg-emerald-600 text-white'
                    : 'bg-[#ff6b00] hover:bg-[#ea580c] text-white shadow-xs'
                }`}
              >
                {pushAllowed ? 'Allowed ✓' : 'Allow'}
              </button>
              <button
                onClick={() => setShowPushBanner(false)}
                className="w-7 h-7 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-700 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
