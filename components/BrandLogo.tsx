import Image from 'next/image'
export default function BrandLogo({ compact = false }: { compact?: boolean }) {
  return <span className="inline-flex min-w-0 items-center gap-2"><Image src="/brand/mark-master.png" width={44} height={44} alt="" className="h-11 w-11 shrink-0 object-contain" /><span className={`${compact ? 'text-base' : 'text-lg'} font-extrabold leading-tight text-slate-950`}>Premium<br className="sm:hidden" /> Verific</span></span>
}
