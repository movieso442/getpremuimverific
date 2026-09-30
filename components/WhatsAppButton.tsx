'use client'

import React from 'react'
import { MessageCircle } from 'lucide-react'
import { usePlatformSettings } from '@/lib/platform/usePlatformSettings'

export const WhatsAppButton: React.FC = () => {
  const settings = usePlatformSettings()
  return (
    <a
      href={`https://wa.me/${settings.whatsapp_number}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Contact Customer Support on WhatsApp ${settings.support_phone}`}
      className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-[#25d366] hover:bg-[#20bd5a] text-white px-4 py-3.5 rounded-full shadow-xl transition-all duration-300 hover:scale-105 group"
    >
      <MessageCircle className="w-6 h-6 fill-white stroke-none" />
      <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 whitespace-nowrap text-xs font-bold">
        Need Help? Chat on WhatsApp {settings.support_phone}
      </span>
    </a>
  )
}
