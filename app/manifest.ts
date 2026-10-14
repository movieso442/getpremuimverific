import type { MetadataRoute } from 'next'
export default function manifest(): MetadataRoute.Manifest {
  return { name: 'Premium Verific', short_name: 'Premium Verific', description: 'Virtual SMS numbers and social media services.', start_url: '/', display: 'standalone', background_color: '#ffffff', theme_color: '#f97316', icons: [{ src: '/brand/icon-192.png', sizes: '192x192', type: 'image/png' }, { src: '/brand/icon-512.png', sizes: '512x512', type: 'image/png' }] }
}
