'use client'

import React from 'react'
import { MessageCircle } from 'lucide-react'

export const WhatsAppButton: React.FC = () => {
  return (
    <a
      href="https://wa.me/237680209047"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Contact Customer Support on WhatsApp +237 680209047"
      className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-[#25d366] hover:bg-[#20bd5a] text-white px-4 py-3.5 rounded-full shadow-xl transition-all duration-300 hover:scale-105 group"
    >
      <MessageCircle className="w-6 h-6 fill-white stroke-none" />
      <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 whitespace-nowrap text-xs font-bold">
        Need Help? Chat on WhatsApp +237 680209047
      </span>
    </a>
  )
}
