'use client'

import React from 'react'
import Link from 'next/link'
import BrandLogo from './BrandLogo'
import { MessageCircle } from 'lucide-react'
import { usePlatformSettings } from '@/lib/platform/usePlatformSettings'
import {useTranslations} from 'next-intl'

export const PublicFooter: React.FC = () => {
  const settings = usePlatformSettings()
  const t = useTranslations('Footer')
  const c = useTranslations('Common')
  return (
    <footer className="bg-white border-t border-gray-100 text-sm text-gray-600 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          
          {/* Brand Info */}
          <div className="space-y-4 md:col-span-1">
            <BrandLogo />
            <p className="text-xs text-gray-500 leading-relaxed">
              {t('description')}
            </p>
          </div>

          {/* Platform Links */}
          <div className="space-y-3">
            <h3 className="font-extrabold text-gray-900 text-sm">{t('services')}</h3>
            <ul className="space-y-2 text-xs">
              <li><Link href="/virtual-numbers" className="hover:text-[#ff5722] transition">{t('smsNumbers')}</Link></li>
              <li><Link href="/sms-verification-guide" className="hover:text-[#ff5722] transition">{t('smsGuide')}</Link></li>
              <li><Link href="/faq" className="hover:text-[#ff5722] transition">SMS questions and answers</Link></li>
              <li><Link href="/social-media-growth" className="hover:text-[#ff5722] transition">{c('socialServices')}</Link></li>
              <li><Link href="/whatsapp" className="hover:text-[#ff5722] transition">{t('assistant')}</Link></li>
              <li><Link href="/downloads" className="hover:text-[#ff5722] transition">{t('download')}</Link></li>
            </ul>
          </div>

          {/* Legal Policies */}
          <div className="space-y-3">
            <h3 className="font-extrabold text-gray-900 text-sm">{t('legal')}</h3>
            <ul className="space-y-2 text-xs">
              <li><Link href="/privacy" className="hover:text-[#ff5722] transition">{c('privacy')}</Link></li>
              <li><Link href="/terms" className="hover:text-[#ff5722] transition">{c('terms')}</Link></li>
              <li><Link href="/refund-policy" className="hover:text-[#ff5722] transition">{t('refundPolicy')}</Link></li>
            </ul>
          </div>

          {/* Contact & Support */}
          <div className="space-y-3">
            <h3 className="font-extrabold text-gray-900 text-sm">{c('support')}</h3>
            <div className="text-xs space-y-2">
              <div>{t('email')}: <strong className="text-gray-900">{settings.support_email}</strong></div>
              <div>{t('whatsappSupport')}: <strong className="text-gray-900">{settings.support_phone}</strong></div>
              <a
                href={`https://wa.me/${settings.whatsapp_number}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition mt-2"
              >
                <MessageCircle className="w-4 h-4" />
                <span>{c('whatsapp')}</span>
              </a>
            </div>
          </div>

        </div>

        <div className="border-t border-gray-100 mt-10 pt-6 flex flex-col md:flex-row items-center justify-between text-xs text-gray-400 gap-4">
          <div>© {new Date().getFullYear()} {t('rights')}</div>
          <div className="flex items-center gap-6 font-medium">
            <Link href="/privacy" className="hover:text-gray-600">{c('privacy')}</Link>
            <Link href="/terms" className="hover:text-gray-600">{c('terms')}</Link>
            <Link href="/refund-policy" className="hover:text-gray-600">{c('refunds')}</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
