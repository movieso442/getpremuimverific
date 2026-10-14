import type { Metadata } from 'next'
import AppShell from '@/components/AppShell'
import './globals.css'
export const metadata: Metadata = {
  metadataBase: new URL('https://premiumverific.com'),
  title: { default: 'Premium Verific', template: '%s | Premium Verific' },
  description: 'Virtual SMS numbers, social media services and customer support from Premium Verific.',
  robots: { index: false, follow: false },
  icons: { icon: [{ url: '/brand/favicon-32.png', sizes: '32x32', type: 'image/png' }, { url: '/brand/icon-512.png', sizes: '512x512', type: 'image/png' }], apple: '/brand/apple-touch-icon.png' },
  manifest: '/manifest.webmanifest',
  verification: { google: process.env.GOOGLE_SITE_VERIFICATION || undefined },
}
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body className="bg-[#f8fafc] text-gray-900 min-h-screen font-sans antialiased"><AppShell>{children}</AppShell></body></html>
}
