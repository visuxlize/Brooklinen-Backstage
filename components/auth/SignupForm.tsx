'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { STORE_CONFIG } from '@/lib/stores'
import { CheckCircle } from 'lucide-react'

const ROLES = ['ops', 'leader', 'associate'] as const

export function SignupForm() {
  const router = useRouter()
  const [form, setForm] = useState({
    name: '',
    email: '',
    role: 'associate' as (typeof ROLES)[number],
    storeId: STORE_CONFIG[0].id as number,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          role: form.role,
          storeId: form.role === 'ops' ? null : form.storeId,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to create user')
      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="text-center py-4">
        <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-6 h-6 text-green-600" />
        </div>
        <h2 className="font-semibold text-slate-900 mb-2">Account Created</h2>
        <p className="text-sm text-slate-500 mb-4">An invite email has been sent to {form.email}.</p>
        <Button variant="secondary" onClick={() => router.push('/admin')}>
          Go to Admin
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
          {error}
        </div>
      )}

      <div>
        <label className="text-xs font-semibold uppercase tracking-widest text-slate-400 block mb-1.5">
          Full Name
        </label>
        <input
          type="text"
          required
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="Jane Smith"
          className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-navy)] w-full"
        />
      </div>

      <div>
        <label className="text-xs font-semibold uppercase tracking-widest text-slate-400 block mb-1.5">
          Email
        </label>
        <input
          type="email"
          required
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          placeholder="jane@brooklinen.com"
          className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-navy)] w-full"
        />
      </div>

      <div>
        <label className="text-xs font-semibold uppercase tracking-widest text-slate-400 block mb-1.5">
          Role
        </label>
        <select
          value={form.role}
          onChange={(e) => setForm({ ...form, role: e.target.value as typeof form.role })}
          className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-navy)] w-full bg-white"
        >
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r.charAt(0).toUpperCase() + r.slice(1)}
            </option>
          ))}
        </select>
      </div>

      {form.role !== 'ops' && (
        <div>
          <label className="text-xs font-semibold uppercase tracking-widest text-slate-400 block mb-1.5">
            Store
          </label>
          <select
            value={form.storeId}
            onChange={(e) => setForm({ ...form, storeId: parseInt(e.target.value) })}
            className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-navy)] w-full bg-white"
          >
            {STORE_CONFIG.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} — {s.city}
              </option>
            ))}
          </select>
        </div>
      )}

      <Button type="submit" isLoading={loading} className="w-full justify-center">
        Create Account &amp; Send Invite
      </Button>
    </form>
  )
}
