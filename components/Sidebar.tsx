'use client'
import Link from 'next/link'
import BrandLogo from './BrandLogo'
import { usePathname } from 'next/navigation'
import { Smartphone, Wallet, List, Share2, UserCheck, ShieldCheck, Download, User } from 'lucide-react'
import {useTranslations} from 'next-intl'

export function Sidebar({ onOpenDeposit, mobile = false }: { onOpenDeposit: () => void; mobile?: boolean }) {
  const pathname = usePathname()
  const t = useTranslations('Navigation')
  const c = useTranslations('Common')
  const links = [
    { href: '/sms-verification', label: c('virtualNumbers'), icon: Smartphone },
    { href: '/dashboard', label: c('socialGrowth'), icon: Share2 },
    { href: '/orders', label: t('orders'), icon: List },
    { href: '/refund-request', label: t('refundRequests'), icon: ShieldCheck },
    { href: '/accounts', label: t('accountStore'), icon: UserCheck },
    { href: '/fb-recovery', label: t('facebookRecovery'), icon: ShieldCheck },
    { href: '/downloads', label: t('mobileApp'), icon: Download },
    { href: '/profile', label: t('profile'), icon: User },
  ]
  return <aside className={`${mobile ? 'w-full' : 'w-64 sticky top-0 h-dvh border-r'} bg-white p-5 flex flex-col gap-5`}>
    <Link href="/" aria-label="Premium Verific home"><BrandLogo compact /></Link>
    <nav aria-label="Services" className="space-y-1">
      {links.map(({ href, label, icon: Icon }) => <Link key={href} href={href} aria-current={pathname === href ? 'page' : undefined} className={`flex items-center gap-3 rounded-xl px-3 py-3 text-base font-semibold ${pathname === href ? 'bg-orange-50 text-orange-700' : 'text-gray-700 hover:bg-gray-50'}`}><Icon size={20} /><span>{label}</span></Link>)}
    </nav>
    <button onClick={onOpenDeposit} className="flex items-center justify-center gap-2 rounded-xl bg-orange-600 px-4 py-3 font-bold text-white"><Wallet size={20} />{t('addFunds')}</button>
    <a href="https://wa.me/237640796062" target="_blank" rel="noopener noreferrer" className="rounded-xl border border-emerald-200 px-4 py-3 text-center font-semibold text-emerald-800">{t('contactSupport')}</a>
  </aside>
}
