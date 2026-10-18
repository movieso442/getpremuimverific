'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import {
  ShieldCheck,
  Zap,
  Smartphone,
  Share2,
  UserCheck,
  CheckCircle2,
  ArrowRight,
  Star,
  MessageSquare,
  Globe,
  Sparkles,
  ChevronDown,
  Lock,
  Mail,
  Phone,
  Bot
} from 'lucide-react'
import { SMS_SERVICES, COUNTRIES, SMM_SERVICES, ACCOUNT_PRODUCTS, PLATFORM_INFO } from '@/lib/mockData'
import { AuthModal } from '@/components/AuthModal'
import OrderCalculator from '@/components/OrderCalculator'
import {useTranslations} from 'next-intl'

export default function LandingPage() {
  const t = useTranslations('Landing')
  const [isAuthOpen, setIsAuthOpen] = useState(false)
  const [authActionTitle, setAuthActionTitle] = useState('Sign In to Premium Verific')
  const [openFaq, setOpenFaq] = useState<number | null>(0)

  // Pricing preview state

  const handleCtaClick = (title: string) => {
    setAuthActionTitle(title)
    setIsAuthOpen(true)
  }

  const faqs = [
    {
      q: t('faq1q'),
      a: t('faq1a')
    },
    {
      q: t('faq2q'),
      a: t('faq2a')
    },
    {
      q: t('faq3q'),
      a: t('faq3a')
    },
    {
      q: t('faq4q'),
      a: t('faq4a')
    }
  ]

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">

      {/* HERO SECTION - HOSTINGER STYLE BOLD & LARGE TYPOGRAPHY */}
      <section className="relative pt-16 pb-24 md:pt-24 md:pb-32 overflow-hidden bg-gradient-to-b from-orange-50/70 via-white to-gray-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col items-center text-center max-w-4xl mx-auto space-y-8">
            
            {/* Top Badge */}
            <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-orange-100/80 text-[#ea580c] border border-orange-200 text-sm font-extrabold shadow-xs">
              <Sparkles className="w-4 h-4" />
              <span>{t('badge')}</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-gray-900 leading-[1.1] tracking-tight">
              {t('headline')}
            </h1>

            {/* Subtitle */}
            <p className="text-base sm:text-lg md:text-xl text-gray-600 max-w-2xl font-medium leading-relaxed">
              {t('subtitle')}
            </p>

            {/* CTA BUTTONS */}
            <div className="pt-4 flex flex-wrap items-center justify-center gap-4 w-full">
              
              {/* CTA 1: Get a UK Number */}
              <Link
                href="/sms-verification"
                className="px-7 py-4.5 rounded-2xl bg-[#ff5722] hover:bg-[#ea580c] text-white font-black text-base transition shadow-lg shadow-orange-500/25 flex items-center gap-3"
              >
                <Smartphone className="w-5 h-5" />
                <span>{t('ukNumber')}</span>
              </Link>

              {/* CTA 2: Boost Social Media */}
              <Link
                href="/dashboard"
                className="px-7 py-4.5 rounded-2xl bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-black text-base transition shadow-lg shadow-blue-500/25 flex items-center gap-3"
              >
                <Share2 className="w-5 h-5" />
                <span>{t('boost')}</span>
              </Link>

              {/* CTA 3: Get Verified */}
              <button
                onClick={() => handleCtaClick('Get Verified Account')}
                className="px-7 py-4.5 rounded-2xl bg-gray-900 hover:bg-black text-white font-black text-base transition shadow-lg flex items-center gap-3"
              >
                <ShieldCheck className="w-5 h-5" />
                <span>{t('verified')}</span>
              </button>

              {/* CTA 4: Sign in with Google */}
              <button
                onClick={() => handleCtaClick('Sign in with Google')}
                className="px-7 py-4.5 rounded-2xl bg-white border border-gray-300 hover:bg-gray-50 text-gray-800 font-extrabold text-base transition shadow-sm flex items-center gap-3"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>{t('google')}</span>
              </button>

            </div>

            {/* Trust Signals */}
            <div className="pt-6 flex flex-wrap items-center justify-center gap-8 text-sm font-bold text-gray-600">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-[#ff5722]" /> {t('trust1')}
              </span>
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-[#ff5722]" /> {t('trust2')}
              </span>
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-[#ff5722]" /> {t('trust3')}
              </span>
            </div>

          </div>
        </div>
      </section>

      {/* CORE SERVICES SECTION */}
      <section id="services" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6 space-y-16">
          
          <div className="text-center max-w-2xl mx-auto space-y-4">
            <span className="text-xs font-black text-[#ea580c] uppercase tracking-widest bg-orange-50 px-4 py-1.5 rounded-full border border-orange-100">
              {t('capabilities')}
            </span>
            <h2 className="text-3xl md:text-5xl font-black text-gray-900">{t('sectionTitle')}</h2>
            <p className="text-base text-gray-600">{t('sectionIntro')}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* Service 1: SMM Growth Panel */}
            <div className="agoverify-card p-8 flex flex-col justify-between space-y-6 hover:border-[#ff5722] transition group">
              <div className="space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-orange-100 text-[#ff5722] flex items-center justify-center font-bold text-xl group-hover:bg-[#ff5722] group-hover:text-white transition">
                  <Share2 className="w-7 h-7" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900">{t('smmTitle')}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {t('smmBody')}
                </p>
                <ul className="space-y-2.5 text-sm text-gray-700 font-medium pt-2">
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4.5 h-4.5 text-[#ea580c]" /> {t('smmPoint1')}</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4.5 h-4.5 text-[#ea580c]" /> {t('smmPoint2')}</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4.5 h-4.5 text-[#ea580c]" /> {t('smmPoint3')}</li>
                </ul>
              </div>

              <button
                onClick={() => handleCtaClick('Access SMM Growth Panel')}
                className="w-full py-4 rounded-xl bg-[#ff5722] hover:bg-[#ea580c] text-white font-extrabold text-sm transition shadow-sm flex items-center justify-center gap-2"
              >
                <span>{t('smmButton')}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Service 2: Virtual SMS Verification */}
            <div id="sms" className="agoverify-card p-8 flex flex-col justify-between space-y-6 hover:border-[#2563eb] transition group">
              <div className="space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-blue-100 text-[#2563eb] flex items-center justify-center font-bold text-xl group-hover:bg-[#2563eb] group-hover:text-white transition">
                  <Smartphone className="w-7 h-7" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900">{t('smsTitle')}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {t('smsBody')}
                </p>
                <ul className="space-y-2.5 text-sm text-gray-700 font-medium pt-2">
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4.5 h-4.5 text-[#2563eb]" /> {t('smsPoint1')}</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4.5 h-4.5 text-[#2563eb]" /> {t('smsPoint2')}</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4.5 h-4.5 text-[#2563eb]" /> {t('smsPoint3')}</li>
                </ul>
              </div>

              <button
                onClick={() => handleCtaClick('Get Virtual SMS Number')}
                className="w-full py-4 rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-extrabold text-sm transition shadow-sm flex items-center justify-center gap-2"
              >
                <span>{t('smsButton')}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Service 3: Accounts & Facebook Rescue */}
            <div id="accounts" className="agoverify-card p-8 flex flex-col justify-between space-y-6 hover:border-gray-900 transition group">
              <div className="space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-gray-100 text-gray-900 flex items-center justify-center font-bold text-xl group-hover:bg-gray-900 group-hover:text-white transition">
                  <UserCheck className="w-7 h-7" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900">{t('accountsTitle')}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {t('accountsBody')}
                </p>
                <ul className="space-y-2.5 text-sm text-gray-700 font-medium pt-2">
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4.5 h-4.5 text-gray-900" /> {t('accountPoint1')}</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4.5 h-4.5 text-gray-900" /> {t('accountPoint2')}</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="w-4.5 h-4.5 text-gray-900" /> {t('accountPoint3')}</li>
                </ul>
              </div>

              <button
                onClick={() => handleCtaClick('Browse Accounts Marketplace')}
                className="w-full py-4 rounded-xl bg-gray-900 hover:bg-black text-white font-extrabold text-sm transition shadow-sm flex items-center justify-center gap-2"
              >
                <span>{t('accountsButton')}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

          </div>
        </div>
      </section>

      {/* PRICING CALCULATOR PREVIEW */}
      <section id="pricing" className="py-24 bg-[#f8fafc]">
        <div className="max-w-4xl mx-auto px-6 space-y-8">
          
          <div className="text-center space-y-3">
            <span className="text-xs font-black text-[#ea580c] uppercase tracking-widest bg-orange-50 px-4 py-1 rounded-full border border-orange-100">
              {t('rates')}
            </span>
            <h2 className="text-3xl md:text-5xl font-black text-gray-900">{t('calculatorTitle')}</h2>
            <p className="text-base text-gray-600">{t('calculatorIntro')}</p>
          </div>

          <OrderCalculator />

        </div>
      </section>

      {/* FAQ ACCORDION SECTION */}
      <section id="faq" className="py-24 bg-white">
        <div className="max-w-3xl mx-auto px-6 space-y-8">
          
          <div className="text-center space-y-3">
            <h2 className="text-3xl md:text-5xl font-black text-gray-900">{t('faqTitle')}</h2>
            <p className="text-base text-gray-600">{t('faqIntro')}</p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <div
                key={idx}
                className="border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-xs transition"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="w-full p-6 text-left flex items-center justify-between font-bold text-gray-900 text-base hover:text-[#ea580c] transition"
                >
                  <span>{faq.q}</span>
                  <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${openFaq === idx ? 'rotate-180 text-[#ea580c]' : ''}`} />
                </button>

                {openFaq === idx && (
                  <div className="px-6 pb-6 text-sm text-gray-600 leading-relaxed border-t border-gray-100 pt-4">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* CTA FOOTER BANNER */}
      <section className="mx-auto max-w-6xl px-5 py-16">
        <div className="flex flex-col items-start justify-between gap-6 rounded-3xl border border-orange-100 bg-orange-50 p-8 sm:flex-row sm:items-center">
          <div><p className="text-xs font-bold uppercase tracking-widest text-orange-700">{t('mobile')}</p><h2 className="mt-3 text-3xl font-black text-slate-950">{t('mobileTitle')}</h2><p className="mt-3 max-w-xl text-slate-600">{t('mobileBody')}</p></div>
          <Link href="/downloads" className="inline-flex shrink-0 items-center gap-2 rounded-2xl bg-orange-700 px-6 py-4 font-bold text-white">{t('downloads')} <ArrowRight className="h-5 w-5" /></Link>
        </div>
      </section>

      <section className="bg-gradient-to-r from-[#ff5722] to-[#ea580c] py-20 text-white text-center">
        <div className="max-w-4xl mx-auto px-6 space-y-6">
          <h2 className="text-4xl md:text-5xl font-black">{t('finalTitle')}</h2>
          <p className="text-base md:text-lg text-white/90 max-w-xl mx-auto font-medium">
            {t('finalBody')}
          </p>

          <div className="pt-4 flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={() => handleCtaClick('Get Started Free')}
              className="px-9 py-4.5 rounded-2xl bg-white text-gray-900 hover:bg-gray-100 font-black text-base transition shadow-lg"
            >
              {t('start')}
            </button>
            <a
              href="https://wa.me/237640796062"
              target="_blank"
              rel="noreferrer"
              className="px-9 py-4.5 rounded-2xl bg-black/30 hover:bg-black/40 text-white font-black text-base transition border border-white/20"
            >
              {t('support')}
            </a>
          </div>
        </div>
      </section>

      {/* AUTH MODAL */}
      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />

    </div>
  )
}
