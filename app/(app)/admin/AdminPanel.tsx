'use client'

import { useState } from 'react'
import { Trash2, UserPlus } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { Chip } from '@/components/ui/Chip'
import { Button } from '@/components/ui/Button'
import { STORE_CONFIG } from '@/lib/stores'
import type { User } from '@/lib/db/schema'
import { format } from 'date-fns'

interface AdminPanelProps {
  users: User[]
}

const ROLES = ['ops', 'leader', 'associate'] as const

export function AdminPanel({ users: initialUsers }: AdminPanelProps) {
  const [users, setUsers] = useState<User[]>(initialUsers)
  const [form, setForm] = useState({
    name: '',
    email: '',
    role: 'associate' as (typeof ROLES)[number],
    storeId: STORE_CONFIG[0].id as number,
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  async function handleAddUser(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
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

      // Refetch users
      const fetchRes = await fetch('/api/admin/users')
      if (fetchRes.ok) {
        const { data: newUsers } = await fetchRes.json()
        setUsers(newUsers)
      }

      setForm({ name: '', email: '', role: 'associate', storeId: STORE_CONFIG[0].id })
      setToast('User created and invite sent.')
      setTimeout(() => setToast(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(userId: string) {
    if (!confirm('Remove this user? This cannot be undone.')) return
    setDeletingId(userId)
    try {
      const res = await fetch(`/api/admin/users?id=${userId}`, { method: 'DELETE' })
      if (res.ok) {
        setUsers((prev) => prev.filter((u) => u.id !== userId))
        setToast('User removed.')
        setTimeout(() => setToast(null), 3000)
      }
    } finally {
      setDeletingId(null)
    }
  }

  const roleVariant = (role: string) => {
    const map: Record<string, 'blue' | 'violet' | 'slate'> = {
      ops: 'blue',
      leader: 'violet',
      associate: 'slate',
    }
    return map[role] ?? 'slate'
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">User Management</h1>
        <p className="text-sm text-slate-500 mt-1">Manage team access across all stores.</p>
      </div>

      {/* Users table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 mb-8 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-widest text-slate-400">
                  Name
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-slate-400">
                  Email
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-slate-400">
                  Role
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-slate-400">
                  Store
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-slate-400">
                  Created
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const store = u.storeId ? STORE_CONFIG.find((s) => s.id === u.storeId) : null
                return (
                  <tr key={u.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={u.name} size="sm" color={store?.color ?? '#64748B'} />
                        <span className="text-sm font-medium text-slate-800">{u.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">{u.email}</td>
                    <td className="px-4 py-3">
                      <Chip label={u.role} variant={roleVariant(u.role)} />
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {store ? (
                        <span className="flex items-center gap-1.5">
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: store.color }}
                          />
                          {store.name}
                        </span>
                      ) : (
                        <span className="text-slate-400">All stores</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-400">
                      {format(new Date(u.createdAt), 'MMM d, yyyy')}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleDelete(u.id)}
                        disabled={deletingId === u.id}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add user form */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
        <h2 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <UserPlus className="w-4 h-4 text-slate-400" />
          Add Team Member
        </h2>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleAddUser} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
          <div>
            <label className="text-xs font-semibold uppercase tracking-widest text-slate-400 block mb-1.5">
              Store
            </label>
            <select
              value={form.storeId}
              onChange={(e) => setForm({ ...form, storeId: parseInt(e.target.value) })}
              disabled={form.role === 'ops'}
              className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-navy)] w-full bg-white disabled:opacity-50 disabled:bg-slate-50"
            >
              {STORE_CONFIG.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2 lg:col-span-4 flex justify-end">
            <Button type="submit" isLoading={submitting}>
              <UserPlus className="w-4 h-4" />
              Add & Send Invite
            </Button>
          </div>
        </form>
      </div>

      {toast && (
        <div className="fixed bottom-4 right-4 z-50 bg-green-600 text-white px-4 py-3 rounded-xl shadow-lg text-sm font-medium">
          {toast}
        </div>
      )}
    </div>
  )
}
