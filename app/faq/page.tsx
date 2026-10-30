import Link from 'next/link'
import { publicMetadata } from '@/lib/seo'

export const metadata = publicMetadata(
  '/faq',
  'SMS Verification and Virtual Number FAQ',
  'Clear answers about temporary SMS numbers, verification codes, activation expiry, cancellation, wallet refunds and platform acceptance.'
)

const questions = [
  { question: 'What is a temporary virtual number for SMS verification?', answer: 'It is a short-term phone number assigned to one activation so you can receive a supported SMS in your Premium Verific inbox. It is not a permanent mobile number, voice plan or reliable long-term account recovery method.' },
  { question: 'How do I buy a temporary number?', answer: 'Sign in, choose the target service and a supported country, review the live price and available stock, then confirm the purchase. The allocated number and any received code appear in your SMS inbox.' },
  { question: 'How long does an SMS activation last?', answer: 'The provider sets the expiry time for each activation. The expiry shown in your inbox is the one to follow. Start the target app’s verification promptly; Premium Verific cannot extend the provider timer.' },
  { question: 'What should I do if my verification code does not arrive?', answer: 'Keep the order open and check your inbox. While the activation is waiting and the provider still permits cancellation, request cancellation from the order. If it times out without a code, the wallet credit is returned after the provider confirms the unused activation ended.' },
  { question: 'Can I cancel an SMS number and get my wallet balance back?', answer: 'You can request cancellation before a code arrives while the provider accepts it. The wallet is credited only after the provider confirms cancellation or an unused timeout. If the supplier response is uncertain, refresh your inbox and contact support before buying again.' },
  { question: 'Will every app or website accept a virtual number?', answer: 'No. Each third-party platform sets its own rules and may reject temporary or virtual numbers. Check its terms before purchase; Premium Verific cannot guarantee acceptance.' },
  { question: 'Can I use a temporary number for password recovery?', answer: 'A temporary number is not a dependable long-term recovery channel because you do not keep it permanently. Use a recovery method that remains under your control, and only use virtual numbers where the platform permits them.' },
  { question: 'How do I add funds to my Premium Verific wallet?', answer: 'Open Add funds, choose a payment method currently offered to your account, and follow its instructions. A wallet is credited only after the payment is verified.' },
]

export default function FaqPage() {
  return <article className="mx-auto max-w-4xl px-6 py-14 sm:py-20">
    <p className="font-bold text-orange-700">Premium Verific help centre</p>
    <h1 className="mt-4 text-4xl font-extrabold tracking-tight sm:text-5xl">SMS verification and virtual number questions</h1>
    <p className="mt-6 text-xl leading-relaxed text-slate-600">Straight answers about temporary numbers, codes, expiry timers, cancellations and wallet credits. Availability and provider rules can change, so always follow the live order details.</p>
    <div className="mt-12 divide-y divide-slate-200 border-y border-slate-200">
      {questions.map(({ question, answer }) => <section key={question} className="py-7">
        <h2 className="text-xl font-bold text-slate-950">{question}</h2>
        <p className="mt-3 text-lg leading-relaxed text-slate-600">{answer}</p>
      </section>)}
    </div>
    <nav aria-label="Related help" className="mt-10 flex flex-wrap gap-5 border-t pt-7 font-semibold text-orange-800">
      <Link href="/virtual-numbers">Explore virtual numbers</Link>
      <Link href="/sms-verification-guide">Read the SMS verification guide</Link>
      <Link href="/refunds">Refund policy</Link>
      <Link href="/sms-verification">Check live SMS availability</Link>
    </nav>
  </article>
}
