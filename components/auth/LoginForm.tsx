'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Mail, Lock } from 'lucide-react'

export function LoginForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [magicLinkSent, setMagicLinkSent] = useState(false)
  const [mode, setMode] = useState<'password' | 'magic'>('password')

  async function handlePasswordLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
    } else {
      router.push('/schedule')
      router.refresh()
    }
    setLoading(false)
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/schedule` },
    })

    if (error) {
      setError(error.message)
    } else {
      setMagicLinkSent(true)
    }
    setLoading(false)
  }

  if (magicLinkSent) {
    return (
      <div className="text-center py-4">
        <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <Mail className="w-6 h-6 text-blue-600" />
        </div>
        <h2 className="font-semibold text-slate-900 mb-2">Check your email</h2>
        <p className="text-sm text-slate-500">
          We sent a magic link to <strong>{email}</strong>. Click it to sign in.
        </p>
      </div>
    )
  }

  return (
    <div>
      {/* Mode toggle */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mb-6">
        <button
          onClick={() => setMode('password')}
          className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            mode === 'password' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'
          }`}
        >
          Password
        </button>
        <button
          onClick={() => setMode('magic')}
          className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            mode === 'magic' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'
          }`}
        >
          Magic Link
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl mb-4">
          {error}
        </div>
      )}

      <form onSubmit={mode === 'password' ? handlePasswordLogin : handleMagicLink} className="space-y-4">
        <div>
          <label className="text-xs font-semibold uppercase tracking-widest text-slate-400 block mb-1.5">
            Email
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@brooklinen.com"
              className="border border-slate-200 rounded-xl pl-10 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-navy)] w-full"
            />
          </div>
        </div>

        {mode === 'password' && (
          <div>
            <label className="text-xs font-semibold uppercase tracking-widest text-slate-400 block mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="border border-slate-200 rounded-xl pl-10 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-navy)] w-full"
              />
            </div>
          </div>
        )}

        <Button type="submit" isLoading={loading} className="w-full justify-center">
          {mode === 'password' ? 'Sign In' : 'Send Magic Link'}
        </Button>
      </form>
    </div>
  )
}
