import type { Metadata } from 'next'
import MobileAuthReturn from '@/components/MobileAuthReturn'
export const metadata: Metadata = { title: 'Return to app', robots: { index: false, follow: false }, referrer: 'no-referrer' }
export default function MobileCallbackPage() { return <MobileAuthReturn /> }
