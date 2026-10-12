'use client'
import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { Sidebar } from './Sidebar'

export default function MobileNavigationDrawer({ onClose, onOpenDeposit }: { onClose: () => void; onOpenDeposit: () => void }) {
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
    <button className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm" onClick={onClose} tabIndex={-1} aria-label="Close navigation" />
    <div ref={dialog} id="mobile-navigation" role="dialog" aria-modal="true" aria-label="Navigation" className="relative h-dvh w-[min(20rem,88vw)] overflow-y-auto bg-white shadow-2xl" onClick={event => { if ((event.target as HTMLElement).closest('a[href]')) onClose() }}>
      <button onClick={onClose} aria-label="Close navigation" className="absolute right-3 top-2 z-40 rounded-lg bg-white p-2 text-gray-700"><X size={20} /></button>
      <Sidebar mobile onOpenDeposit={() => { onClose(); onOpenDeposit() }} />
    </div>
  </div>
}
