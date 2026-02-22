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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
    } else {
      window.location.href = '/schedule'
      return
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

  return (
    <div>
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-200 text-sm px-4 py-3 rounded-xl mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
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

        <Button type="submit" isLoading={loading} className="w-full justify-center">
          Sign In
        </Button>
      </form>
    </div>
  )
}
