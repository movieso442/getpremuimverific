import type { MetadataRoute } from 'next'
import { SEO_LAST_MODIFIED, SEO_PATHS, SITE_URL } from '@/lib/seo'
export default function sitemap(): MetadataRoute.Sitemap {
  return SEO_PATHS.map(path => ({ url: SITE_URL + path, lastModified: SEO_LAST_MODIFIED[path], changeFrequency: 'monthly', priority: path === '/' ? 1 : 0.8 }))
}
