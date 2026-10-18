'use client'
import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { Sidebar } from './Sidebar'
import { useTranslations } from 'next-intl'

export default function MobileNavigationDrawer({ onClose, onOpenDeposit }: { onClose: () => void; onOpenDeposit: () => void }) {
  const t = useTranslations('MobileNavigation')
  const dialog = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialog.current?.querySelector<HTMLElement>('button')?.focus()
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
      if (event.key !== 'Tab') return
      const elements = Array.from(dialog.current?.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),input:not([disabled])') || []).filter(element => element.getClientRects().length)
      const first = elements[0], last = elements[elements.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
    }
    document.addEventListener('keydown', key)
    return () => { document.body.style.overflow = overflow; document.removeEventListener('keydown', key); previous?.focus() }
  }, [onClose])
  return <div className="fixed inset-0 z-50 md:hidden">
    <button className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm" onClick={onClose} tabIndex={-1} aria-label={t('close')} />
    <div ref={dialog} id="mobile-navigation" role="dialog" aria-modal="true" aria-label={t('navigation')} className="absolute bottom-0 left-0 right-0 max-h-[92dvh] overflow-y-auto rounded-t-3xl bg-white shadow-2xl" onClick={event => { if ((event.target as HTMLElement).closest('a[href]')) onClose() }}>
      <div className="sticky top-0 z-40 flex items-center justify-between border-b bg-white px-5 py-3"><span className="text-lg font-bold">{t('services')}</span><button onClick={onClose} aria-label={t('close')} className="rounded-xl p-3 text-gray-700"><X size={24} /></button></div>
      <Sidebar mobile onOpenDeposit={() => { onClose(); onOpenDeposit() }} />
    </div>
  </div>
}
