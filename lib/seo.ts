import type { Metadata } from 'next'
export const SITE_URL = 'https://premiumverific.com'
export const SEO_PATHS = ['/', '/virtual-numbers', '/sms-verification-guide', '/social-media-growth', '/refunds', '/downloads'] as const
export function publicMetadata(path: string, title: string, description: string): Metadata {
  return { title, description, alternates: { canonical: SITE_URL + path }, robots: { index: true, follow: true }, openGraph: { type: 'website', siteName: 'Premium Verific', url: SITE_URL + path, title, description, images: [{ url: '/logo.jpg', width: 1264, height: 842, alt: 'Premium Verific logo' }] }, twitter: { card: 'summary_large_image', title, description, images: ['/logo.jpg'] } }
}
export function shouldIndex(path: string, host: string, search: URLSearchParams) {
  return ['premiumverific.com','www.premiumverific.com'].includes(host) && SEO_PATHS.some(item => item === path) && !['code','token','ref'].some(key => search.has(key))
}
