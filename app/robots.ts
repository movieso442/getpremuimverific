import type { MetadataRoute } from 'next'
export default function robots(): MetadataRoute.Robots {
  // Private HTML remains crawlable so crawlers can see noindex. Access control,
  // not robots.txt, protects customer data. Tokens/API routes are never indexed.
  return { rules: { userAgent: '*', allow: '/', disallow: ['/api/','/auth/','/bot-topup','/email-preferences'] }, sitemap: 'https://premiumverific.com/sitemap.xml' }
}
