'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Mail, Lock, LogOut } from 'lucide-react'

export function LoginForm({ signOutOnly }: { signOutOnly?: boolean } = {}) {
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
      // Full page navigation so the next request sends the new auth cookies
      window.location.href = '/schedule'
      return
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

  async function handleSignOut() {
    setLoading(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  if (signOutOnly) {
    return (
      <Button onClick={handleSignOut} isLoading={loading} variant="secondary" className="w-full justify-center">
        <LogOut className="w-4 h-4" />
        Sign out
      </Button>
    )
  }

  if (magicLinkSent) {
    return (
      <div className="text-center py-4">
        <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <Mail className="w-6 h-6 text-blue-600 dark:text-blue-300" />
        </div>
        <h2 className="font-semibold text-[var(--text)] mb-2">Check your email</h2>
        <p className="text-sm text-[var(--text-muted)]">
          We sent a magic link to <strong className="text-[var(--text)]">{email}</strong>. Click it to sign in.
        </p>
      </div>
    )
  }

  return (
    <div>
      {/* Mode toggle */}
      <div className="flex gap-1 bg-slate-100 dark:bg-white/10 rounded-xl p-1 mb-6">
        <button
          type="button"
          onClick={() => setMode('password')}
          className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            mode === 'password' ? 'bg-white dark:bg-white/20 shadow-sm text-[var(--text)]' : 'text-[var(--text-muted)]'
          }`}
        >
          Password
        </button>
        <button
          type="button"
          onClick={() => setMode('magic')}
          className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            mode === 'magic' ? 'bg-white dark:bg-white/20 shadow-sm text-[var(--text)]' : 'text-[var(--text-muted)]'
          }`}
        >
          Magic Link
        </button>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-200 text-sm px-4 py-3 rounded-xl mb-4">
          {error}
        </div>
      )}

      <form onSubmit={mode === 'password' ? handlePasswordLogin : handleMagicLink} className="space-y-4">
        <div>
          <label className="text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)] block mb-1.5">
            Email
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@brooklinen.com"
              className="border border-[var(--border)] rounded-xl pl-10 pr-3 py-2 text-sm bg-[var(--card)] text-[var(--text)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-navy)] w-full"
            />
          </div>
        </div>

        {mode === 'password' && (
          <div>
            <label className="text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)] block mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="border border-[var(--border)] rounded-xl pl-10 pr-3 py-2 text-sm bg-[var(--card)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-navy)] w-full"
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
