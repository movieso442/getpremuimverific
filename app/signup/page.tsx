'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { authErrorMessage, safeNextPath, webAuthCallback } from '@/lib/auth/flows'
import { createClient } from '@/lib/supabase/client'
import confetti from 'canvas-confetti'
import {useTranslations} from 'next-intl'

export default function SignupPage() {
  const t = useTranslations('Auth')
  const common = useTranslations('Common')
  const router = useRouter()
  const supabase = createClient()
  const requestedNext = typeof window === 'undefined' ? null : new URLSearchParams(window.location.search).get('next')
  const nextPath = safeNextPath(requestedNext)

  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [termsAgreed, setTermsAgreed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [notice, setNotice] = useState('')
  const [cooldown, setCooldown] = useState(0)
  useEffect(() => { if (cooldown <= 0) return; const timer = setTimeout(() => setCooldown(value => value - 1), 1000); return () => clearTimeout(timer) }, [cooldown])

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      setErrorMsg(t('signupMissing'))
      return
    }
    if (password !== confirmPassword) {
      setErrorMsg(t('passwordMismatch'))
      return
    }
    if (password.length < 8) { setErrorMsg(t('passwordLength')); return }
    if (!termsAgreed) {
      setErrorMsg(t('termsRequired'))
      return
    }

    setLoading(true)
    setErrorMsg('')
    setNotice('')

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: webAuthCallback(window.location.origin, nextPath),
          data: {
            full_name: `${firstName} ${lastName}`.trim() || username || 'Member',
            phone: phone || undefined
          }
        }
      })

      if (error) throw error
      if (!data.session) {
        setNotice(t('confirmation'))
        setCooldown(60)
        return
      }
      confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 } })
      router.push(nextPath)
      router.refresh()
    } catch (err: unknown) {
      setErrorMsg(authErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }
  const resend = async () => {
    if (loading || cooldown > 0) return
    setLoading(true); setErrorMsg('')
    try {
      const { error } = await supabase.auth.resend({ type: 'signup', email: email.trim(), options: { emailRedirectTo: webAuthCallback(window.location.origin, nextPath) } })
      if (error) throw error
      setNotice(t('confirmation')); setCooldown(60)
    } catch (error) { setErrorMsg(authErrorMessage(error)) } finally { setLoading(false) }
  }

  const handleGoogleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: webAuthCallback(window.location.origin, nextPath) }
      })
      if (error) throw error
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Google sign-in could not be started.')
    }
  }

  return (
    <div className="py-12 px-6 max-w-7xl mx-auto w-full flex-1">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Column: Sign Up Form Box */}
          <div className="lg:col-span-6 bg-white rounded-3xl border border-gray-200 p-8 md:p-10 shadow-sm space-y-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-gray-900">{t('signupTitle')}</h1>
              <p className="text-xs text-gray-500 mt-1">{t('signupHelp')}</p>
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs font-bold">
                {errorMsg}
              </div>
            )}
            {notice && <div role="status" className="space-y-3 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900"><p>{notice}</p><button type="button" disabled={loading || cooldown > 0} onClick={() => void resend()} className="font-bold underline disabled:opacity-50">{cooldown > 0 ? t('resendCountdown', {seconds: cooldown}) : t('resend')}</button><p><Link href="/login" className="font-bold underline">{t('haveAccount')} {t('loginButton')}</Link></p></div>}

            <form onSubmit={handleSignup} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder={t('username')}
                    className="w-full bg-[#f8fafc] border border-gray-200 rounded-xl p-3.5 text-xs font-semibold text-gray-900 outline-none focus:border-[#ff5722] focus:bg-white transition"
                    required
                  />
                </div>
                <div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t('email')}
                    className="w-full bg-[#f8fafc] border border-gray-200 rounded-xl p-3.5 text-xs font-semibold text-gray-900 outline-none focus:border-[#ff5722] focus:bg-white transition"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder={t('firstName')}
                    className="w-full bg-[#f8fafc] border border-gray-200 rounded-xl p-3.5 text-xs font-semibold text-gray-900 outline-none focus:border-[#ff5722] focus:bg-white transition"
                  />
                </div>
                <div>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder={t('lastName')}
                    className="w-full bg-[#f8fafc] border border-gray-200 rounded-xl p-3.5 text-xs font-semibold text-gray-900 outline-none focus:border-[#ff5722] focus:bg-white transition"
                  />
                </div>
              </div>

              <div>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder={t('phone')}
                  className="w-full bg-[#f8fafc] border border-gray-200 rounded-xl p-3.5 text-xs font-semibold text-gray-900 outline-none focus:border-[#ff5722] focus:bg-white transition"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <input
                    type="password"
                    minLength={8}
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t('password')}
                    className="w-full bg-[#f8fafc] border border-gray-200 rounded-xl p-3.5 text-xs font-semibold text-gray-900 outline-none focus:border-[#ff5722] focus:bg-white transition"
                    required
                  />
                </div>
                <div>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder={t('confirmPassword')}
                    autoComplete="new-password"
                    className="w-full bg-[#f8fafc] border border-gray-200 rounded-xl p-3.5 text-xs font-semibold text-gray-900 outline-none focus:border-[#ff5722] focus:bg-white transition"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1 text-xs text-gray-600">
                <input
                  type="checkbox"
                  id="terms"
                  checked={termsAgreed}
                  onChange={(e) => setTermsAgreed(e.target.checked)}
                  className="rounded text-[#ff5722] focus:ring-[#ff5722]"
                />
                <label htmlFor="terms">
                  {t('termsAgree')} <Link href="/terms" className="text-[#ff5722] underline font-bold">{common('terms')}</Link>
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 rounded-xl bg-[#ff5722] hover:bg-[#ea580c] text-white font-extrabold text-sm uppercase tracking-wider transition shadow-md flex items-center justify-center gap-2"
              >
                <span>{loading ? t('creating') : t('signup')}</span>
              </button>
            </form>

            <div className="relative border-t border-gray-200 pt-4">
              <button
                onClick={handleGoogleLogin}
                className="w-full py-3.5 px-4 rounded-xl border border-gray-300 hover:bg-gray-50 text-gray-800 font-bold text-xs transition flex items-center justify-center gap-3 shadow-2xs"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>{t('google')}</span>
              </button>
            </div>

            <div className="text-center text-xs text-gray-500">
              {t('haveAccount')}{' '}
              <Link href="/login" className="text-[#ff5722] font-bold underline">
                {t('loginButton')}
              </Link>
            </div>
          </div>

          <aside className="lg:col-span-6 rounded-3xl border border-orange-100 bg-orange-50 p-8 md:p-10">
            <h2 className="text-2xl font-black text-gray-900">{t('whatNext')}</h2>
            <ol className="mt-6 space-y-5 text-base text-gray-700">
              {[t('step1'), t('step2'), t('step3')].map((step, index) => <li key={step} className="flex gap-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-600 font-bold text-white">{index + 1}</span><span>{step}</span></li>)}
            </ol>
          </aside>
        </div>
    </div>
  )
}
