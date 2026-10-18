import type { Metadata } from 'next'
import AppShell from '@/components/AppShell'
import {NextIntlClientProvider} from 'next-intl'
import {getLocale, getMessages} from 'next-intl/server'
import './globals.css'
export const metadata: Metadata = {
  metadataBase: new URL('https://premiumverific.com'),
  applicationName: 'premiumverific',
  appleWebApp: { title: 'premiumverific', capable: true, statusBarStyle: 'default' },
  title: { default: 'Premium Verific', template: '%s | Premium Verific' },
  description: 'Virtual SMS numbers, social media services and customer support from Premium Verific.',
  robots: { index: false, follow: false },
  icons: {
    icon: [
      { url: '/brand/favicon.png', sizes: '96x96', type: 'image/png' },
      { url: '/brand/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/brand/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/brand/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    shortcut: '/favicon.ico',
    apple: [{ url: '/brand/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  manifest: '/manifest.webmanifest',
  verification: { google: process.env.GOOGLE_SITE_VERIFICATION || undefined },
}
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale()
  const messages = await getMessages()
  return <html lang={locale}><body className="bg-[#f8fafc] text-gray-900 min-h-screen font-sans antialiased"><NextIntlClientProvider locale={locale} messages={messages}><AppShell>{children}</AppShell></NextIntlClientProvider></body></html>
}
