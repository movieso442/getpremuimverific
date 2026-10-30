import LandingPage from '@/components/LandingPage'
import { publicMetadata, SITE_URL } from '@/lib/seo'
export const metadata = publicMetadata('/', 'Virtual SMS Numbers & Social Media Services', 'Buy temporary SMS verification numbers, compare live prices by country, and order social media services with clear XAF wallet pricing from Premium Verific.')
export default function HomePage() {
  const schema = { '@context': 'https://schema.org', '@graph': [
    { '@type': 'WebSite', '@id': SITE_URL + '/#website', url: SITE_URL, name: 'Premium Verific' },
    { '@type': 'Organization', '@id': SITE_URL + '/#organization', name: 'Premium Verific', url: SITE_URL, logo: SITE_URL + '/brand/icon-512.png', email: 'hello@premiumverific.com', telephone: '+237640796062' },
  ] }
  return <><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, '\\u003c') }} /><LandingPage /></>
}
