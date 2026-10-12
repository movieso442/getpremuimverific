'use client'

import React, { useCallback, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import './globals.css'
import { AppStateProvider } from '@/lib/store'
import { Sidebar } from '@/components/Sidebar'
import { JapHeader } from '@/components/JapHeader'
import { JapFooter } from '@/components/JapFooter'
import { PublicHeader } from '@/components/PublicHeader'
import { PublicFooter } from '@/components/PublicFooter'
import MobileNavigationDrawer from '@/components/MobileNavigationDrawer'
import { WhatsAppButton } from '@/components/WhatsAppButton'
import { AnalyticsTracker } from '@/components/AnalyticsTracker'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [menuPath, setMenuPath] = useState<string | null>(null)
  const isSidebarOpenMobile = menuPath === pathname
  const closeMenu = useCallback(() => setMenuPath(null), [])
  const openDeposit = () => router.push('/add-funds')

  // Public pages that should render with PublicHeader & PublicFooter instead of Dashboard Sidebar
  const publicRoutes = ['/', '/terms', '/privacy', '/refund-policy', '/login', '/signup', '/downloads']
  const isPublicPage = publicRoutes.includes(pathname)
  const isAdminPage = pathname.startsWith('/admin')

  return (
    <html lang="en">
      <head>
        <title>Premium Verify - Best & Cheapest SMM Panel & SMS Virtual Verification</title>
        <meta
          name="description"
          content="Premium Verify (premiumverific.com): High retention YouTube monetization, organic Instagram followers, TikTok views, Facebook page boost & rescue, virtual phone numbers across 197 countries. Contact: +237 680209047 / hello@premiumverific.com."
        />
        <meta name="keywords" content="Premium Verify, SMM Panel, SMS Verification, Virtual Phone Number, YouTube Monetization, Facebook Rescue, TikTok Followers" />
        <meta property="og:title" content="Premium Verify - Best & Cheapest SMM Panel & SMS Verification" />
        <meta property="og:description" content="Boost your social media presence with automated instant delivery SMM Panel services and get virtual phone numbers across 197 countries." />
        <meta property="og:url" content="https://premiumverific.com" />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body className="bg-[#f8fafc] text-gray-900 min-h-screen font-sans antialiased">
        {isAdminPage || pathname === '/bot-topup' ? <main className="min-h-screen">{children}</main> : <AppStateProvider>
          <AnalyticsTracker />
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
              <div className="hidden md:block sticky top-0 h-screen z-30">
                <Sidebar onOpenDeposit={openDeposit} />
              </div>
              {isSidebarOpenMobile && <MobileNavigationDrawer onClose={closeMenu} onOpenDeposit={openDeposit} />}

              {/* Main Content Area */}
              <div className="flex-1 flex flex-col min-w-0 bg-[#f8fafc]">
                {/* Dashboard Top Bar */}
                <JapHeader
                  onToggleSidebar={() => setMenuPath(isSidebarOpenMobile ? null : pathname)}
                  onOpenDeposit={openDeposit}
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
          {!isAdminPage && <WhatsAppButton />}

        </AppStateProvider>}
      </body>
    </html>
  )
}
