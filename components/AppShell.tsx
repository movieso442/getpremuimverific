'use client'

import React, { useCallback, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { AppStateProvider } from '@/lib/store'
import { Sidebar } from '@/components/Sidebar'
import { JapHeader } from '@/components/JapHeader'
import { JapFooter } from '@/components/JapFooter'
import { PublicHeader } from '@/components/PublicHeader'
import { PublicFooter } from '@/components/PublicFooter'
import MobileNavigationDrawer from '@/components/MobileNavigationDrawer'
import { WhatsAppButton } from '@/components/WhatsAppButton'
import { AnalyticsTracker } from '@/components/AnalyticsTracker'

export default function AppShell({
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
  const privateRoutes = ['/dashboard','/add-funds','/sms-verification','/profile','/orders','/accounts','/fb-recovery','/services','/tickets','/massorder','/subscriptions','/updates','/vip-updates','/rent-number','/developer','/ai-assistant','/refund-request']
  const isPublicPage = !privateRoutes.some(route => pathname === route || pathname.startsWith(route + '/'))
  const isAdminPage = pathname.startsWith('/admin')

  return (
    <>
        {isAdminPage || pathname === '/bot-topup' || pathname.startsWith('/auth/') ? <main className="min-h-screen">{children}</main> : <AppStateProvider>
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
          {!isAdminPage && !isSidebarOpenMobile && <WhatsAppButton />}

        </AppStateProvider>}
    </>
  )
}
