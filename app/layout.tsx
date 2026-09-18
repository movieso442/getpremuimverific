'use client'

import React, { useState } from 'react'
import { usePathname } from 'next/navigation'
import './globals.css'
import { AppStateProvider } from '@/lib/store'
import { Sidebar } from '@/components/Sidebar'
import { JapHeader } from '@/components/JapHeader'
import { JapFooter } from '@/components/JapFooter'
import { PublicHeader } from '@/components/PublicHeader'
import { PublicFooter } from '@/components/PublicFooter'
import { DepositModal } from '@/components/DepositModal'
import { WhatsAppButton } from '@/components/WhatsAppButton'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const [isDepositOpen, setIsDepositOpen] = useState(false)
  const [isSidebarOpenMobile, setIsSidebarOpenMobile] = useState(false)

  // Public pages that should render with PublicHeader & PublicFooter instead of Dashboard Sidebar
  const publicRoutes = ['/', '/terms', '/privacy', '/refund-policy', '/login', '/signup']
  const isPublicPage = publicRoutes.includes(pathname)

  return (
    <html lang="en">
      <head>
        <title>Premium Verify - Best & Cheapest SMM Panel & SMS Virtual Verification</title>
        <meta
          name="description"
          content="Premium Verify (premiumverific.com): High retention YouTube monetization, organic Instagram followers, TikTok views, Facebook page boost & rescue, virtual phone numbers across 197 countries. Contact: +237 677034736 / hello@premiumverific.com."
        />
        <meta name="keywords" content="Premium Verify, SMM Panel, SMS Verification, Virtual Phone Number, YouTube Monetization, Facebook Rescue, TikTok Followers" />
        <meta property="og:title" content="Premium Verify - Best & Cheapest SMM Panel & SMS Verification" />
        <meta property="og:description" content="Boost your social media presence with automated instant delivery SMM Panel services and get virtual phone numbers across 197 countries." />
        <meta property="og:url" content="https://premiumverific.com" />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body className="bg-[#f8fafc] text-gray-900 min-h-screen font-sans antialiased">
        <AppStateProvider>
          {isPublicPage ? (
            /* Public Website Page View (Header, Body, Public Footer) */
            <div className="min-h-screen flex flex-col justify-between bg-white">
              <PublicHeader />
              <main className="flex-1">
                {children}
              </main>
              <PublicFooter />
            </div>
          ) : (
            /* Authenticated Portal View (Left Sidebar & Top Header) */
            <div className="flex min-h-screen">
              {/* Left Sidebar Navigation */}
              <div className={`${isSidebarOpenMobile ? 'block' : 'hidden'} md:block sticky top-0 h-screen z-30`}>
                <Sidebar onOpenDeposit={() => setIsDepositOpen(true)} />
              </div>

              {/* Main Content Area */}
              <div className="flex-1 flex flex-col min-w-0 bg-[#f8fafc]">
                {/* Dashboard Top Bar */}
                <JapHeader
                  onToggleSidebar={() => setIsSidebarOpenMobile(!isSidebarOpenMobile)}
                  onOpenDeposit={() => setIsDepositOpen(true)}
                />

                {/* Body Content */}
                <main className="p-4 md:p-8 flex-1 max-w-7xl w-full mx-auto">
                  {children}
                </main>

                {/* Dashboard Footer */}
                <JapFooter />
              </div>
            </div>
          )}

          {/* Floating WhatsApp Widget */}
          <WhatsAppButton />

          {/* Deposit Modal */}
          <DepositModal
            isOpen={isDepositOpen}
            onClose={() => setIsDepositOpen(false)}
          />
        </AppStateProvider>
      </body>
    </html>
  )
}
