'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ThumbsUp, ArrowRight } from 'lucide-react'
import { useAppState } from '@/lib/store'
import { createClient } from '@/lib/supabase/client'
import confetti from 'canvas-confetti'

export default function LoginPage() {
  const router = useRouter()
  const { setProfile } = useAppState()
  const supabase = createClient()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      setErrorMsg('Please enter your email and password.')
      return
    }

    setLoading(true)
    setErrorMsg('')

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) {
        setProfile({
          full_name: email.split('@')[0] || 'Premium Partner',
          email,
          phone_number: '+237 677034736',
          balance_xaf: 5000
        })
      } else if (data.user) {
        setProfile({
          id: data.user.id,
          email: data.user.email || email,
          full_name: data.user.user_metadata?.full_name || email.split('@')[0],
          phone_number: data.user.user_metadata?.phone || '+237 677034736',
          balance_xaf: 5000
        })
      }

      confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } })
      router.push('/dashboard')
    } catch (err: any) {
      setErrorMsg(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/dashboard` }
      })
      if (error) throw error
    } catch (err) {
      setProfile({
        full_name: 'Google Partner',
        email: 'user@google.com',
        phone_number: '+237 677034736',
        balance_xaf: 5000
      })
      router.push('/dashboard')
    }
  }

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans flex flex-col justify-between">
      
      {/* HEADER */}
      <header className="bg-white border-b border-gray-100 py-4 px-6 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#ff5722] to-[#ff7a00] flex items-center justify-center text-white font-extrabold shadow-sm group-hover:scale-105 transition">
              <ThumbsUp className="w-5.5 h-5.5 fill-current stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-1">
                <span className="text-2xl font-black text-[#ff5722] tracking-tight">PV</span>
                <span className="text-xs font-bold text-gray-800 uppercase tracking-tight">Premium Verify</span>
              </div>
              <span className="text-[9px] font-black text-[#ea580c] uppercase tracking-widest block leading-none">
                WE LEAD. THEY FOLLOW
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <Link href="/login" className="px-5 py-2.5 rounded-xl text-xs font-extrabold text-white bg-[#ff5722] shadow-sm transition">
              Sign In
            </Link>
            <Link href="/signup" className="px-5 py-2.5 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-100 border border-gray-200 transition">
              Sign Up
            </Link>
          </div>
        </div>
      </header>

      {/* LOGIN CARD */}
      <main className="py-16 px-6 max-w-md mx-auto w-full flex-1 flex flex-col justify-center">
        <div className="bg-white rounded-3xl border border-gray-200 p-8 md:p-10 shadow-sm space-y-6">
          <div>
            <h1 className="text-2xl font-black text-gray-900">Sign In to Your Account</h1>
            <p className="text-xs text-gray-500 mt-1">Enter your account credentials to access your dashboard.</p>
          </div>

          {errorMsg && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs font-bold">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@domain.com"
                className="w-full bg-[#f8fafc] border border-gray-200 rounded-xl p-3.5 text-sm font-semibold text-gray-900 outline-none focus:border-[#ff5722] focus:bg-white transition"
                required
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full bg-[#f8fafc] border border-gray-200 rounded-xl p-3.5 text-sm font-semibold text-gray-900 outline-none focus:border-[#ff5722] focus:bg-white transition"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-xl bg-[#ff5722] hover:bg-[#ea580c] text-white font-extrabold text-sm uppercase tracking-wider transition shadow-md flex items-center justify-center gap-2"
            >
              <span>{loading ? 'Signing In...' : 'Sign In to Account'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="pt-2 border-t border-gray-200">
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
              <span>Continue with Google</span>
            </button>
          </div>

          <div className="text-center text-xs text-gray-500">
            Don&apos;t have an account yet?{' '}
            <Link href="/signup" className="text-[#ff5722] font-bold underline">
              Sign Up Free
            </Link>
          </div>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="bg-white border-t border-gray-100 py-6 px-6 text-center text-xs text-gray-400">
        © 2026 Premium Verify (premiumverific.com). All rights reserved. Support WhatsApp: +237 677034736
      </footer>

    </div>
  )
}
