import type { MetadataRoute } from 'next'
import { SEO_PATHS, SITE_URL } from '@/lib/seo'
export default function sitemap(): MetadataRoute.Sitemap {
  return SEO_PATHS.map(path => ({ url: SITE_URL + path, lastModified: '2026-10-14', changeFrequency: 'monthly', priority: path === '/' ? 1 : 0.8 }))
}
