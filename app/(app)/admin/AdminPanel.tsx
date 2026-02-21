'use client'

import { useState } from 'react'
import { Trash2, UserPlus, Pencil, Check, X, Mail, User, Lock } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { Chip } from '@/components/ui/Chip'
import { Button } from '@/components/ui/Button'
import { STORE_CONFIG } from '@/lib/stores'
import type { User as DbUser } from '@/lib/db/schema'
import type { CurrentUser } from '@/lib/auth'
import { format } from 'date-fns'

interface AdminPanelProps {
  users: DbUser[]
  currentUser: CurrentUser
}

type EditingState = {
  id: string
  name: string
  email: string
  role: 'ops' | 'leader' | 'associate'
  storeId: number | null
}

const ALL_ROLES = ['ops', 'leader', 'associate'] as const
const LEADER_ROLES = ['associate'] as const

const roleVariant = (role: string): 'blue' | 'violet' | 'slate' => {
  const map: Record<string, 'blue' | 'violet' | 'slate'> = {
    ops: 'blue',
    leader: 'violet',
    associate: 'slate',
  }
  return map[role] ?? 'slate'
}

export function AdminPanel({ users: initialUsers, currentUser }: AdminPanelProps) {
  const [userList, setUserList] = useState<DbUser[]>(initialUsers)
  const [editing, setEditing] = useState<EditingState | null>(null)
  const [savingEdit, setSavingEdit] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [addForm, setAddForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'associate' as 'ops' | 'leader' | 'associate',
    storeId: (currentUser.storeId ?? STORE_CONFIG[0].id) as number | null,
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const isOps = currentUser.role === 'ops'
  const availableRoles = isOps ? ALL_ROLES : LEADER_ROLES
  // Ops = HQ + all 8 stores (9 options); leaders = their store only
  const storeOptionsForAdd = isOps
    ? [{ value: '', label: 'HQ' }, ...STORE_CONFIG.map((s) => ({ value: String(s.id), label: s.name }))]
    : STORE_CONFIG.filter((s) => s.id === currentUser.storeId).map((s) => ({ value: String(s.id), label: s.name }))

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  async function refreshUsers() {
    const res = await fetch('/api/admin/users')
    if (res.ok) {
      const { data } = await res.json()
      setUserList(data)
    }
  }

  // ── Inline edit ──────────────────────────────────────────────
  function updateEditing(patch: Partial<EditingState>) {
    setEditing((prev) => (prev ? { ...prev, ...patch } : prev))
  }

  function startEdit(u: DbUser) {
    setEditing({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role as 'ops' | 'leader' | 'associate',
      storeId: u.storeId ?? null,
    })
  }

  function cancelEdit() {
    setEditing(null)
  }

  async function saveEdit() {
    if (!editing) return
    setSavingEdit(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/users?id=${editing.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editing.name,
          email: editing.email,
          role: editing.role,
          storeId: editing.role === 'ops' ? null : editing.storeId,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to update')

      setUserList((prev) =>
        prev.map((u) => (u.id === editing.id ? { ...u, ...data.data } : u))
      )
      setEditing(null)
      showToast('User updated.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed')
    } finally {
      setSavingEdit(false)
    }
  }

  // ── Delete ────────────────────────────────────────────────────
  async function handleDelete(userId: string, userName: string) {
    if (!confirm(`Remove ${userName}? This cannot be undone.`)) return
    setDeletingId(userId)
    try {
      const res = await fetch(`/api/admin/users?id=${userId}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Delete failed')
      setUserList((prev) => prev.filter((u) => u.id !== userId))
      showToast(`${userName} removed.`)
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Delete failed')
    } finally {
      setDeletingId(null)
    }
  }

  // ── Add user ──────────────────────────────────────────────────
  async function handleAddUser(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: addForm.name,
          email: addForm.email,
          password: addForm.password,
          role: addForm.role,
          storeId: addForm.role === 'ops' ? null : (addForm.storeId ?? undefined),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to create user')

      await refreshUsers()
      setAddForm({
        name: '',
        email: '',
        password: '',
        role: 'associate',
        storeId: currentUser.storeId ?? STORE_CONFIG[0].id,
      })
      setShowAddForm(false)
      showToast('User added.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="p-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            {isOps ? 'User Management' : 'My Store Team'}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {isOps
              ? 'Add, edit, or remove users and their stores and roles. Ops have full access.'
              : 'Add, edit, or remove associates at your store.'}
          </p>
        </div>
        <Button onClick={() => { setShowAddForm((v) => !v); setError(null) }}>
          <UserPlus className="w-4 h-4" />
          Add Member
        </Button>
      </div>

      {/* Add user form */}
      {showAddForm && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 mb-6">
          <h2 className="text-sm font-semibold text-slate-800 mb-4">New Team Member</h2>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl mb-4">
              {error}
            </div>
          )}
          <form onSubmit={handleAddUser} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Name */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-widest text-slate-400 block mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  required
                  value={addForm.name}
                  onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                  placeholder="Jane Smith"
                  className="border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-navy)] w-full"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-widest text-slate-400 block mb-1.5">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="email"
                  required
                  value={addForm.email}
                  onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                  placeholder="jane@brooklinen.com"
                  className="border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-navy)] w-full"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-widest text-slate-400 block mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={addForm.password}
                  onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
                  placeholder="Min 6 characters"
                  className="border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-navy)] w-full"
                />
              </div>
              <p className="text-xs text-slate-400 mt-1">User will sign in with this; they can change it later.</p>
            </div>

            {/* Role */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-widest text-slate-400 block mb-1.5">
                Role
              </label>
              <select
                value={addForm.role}
                onChange={(e) => {
                  const role = e.target.value as typeof addForm.role
                  setAddForm({
                    ...addForm,
                    role,
                    storeId: role === 'ops' ? null : (currentUser.storeId ?? STORE_CONFIG[0].id) as number | null,
                  })
                }}
                className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-navy)] w-full bg-white"
              >
                {availableRoles.map((r) => (
                  <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                ))}
              </select>
            </div>

            {/* Store — HQ for ops, retail stores for leaders/associates */}
            <div>
              <label className="text-xs font-semibold uppercase tracking-widest text-slate-400 block mb-1.5">
                Store
              </label>
              <select
                value={addForm.role === 'ops' ? '' : String(addForm.storeId ?? '')}
                onChange={(e) =>
                  setAddForm({
                    ...addForm,
                    storeId: e.target.value === '' ? null : parseInt(e.target.value),
                  })
                }
                disabled={!isOps && addForm.role !== 'ops'}
                title={isOps ? 'HQ or one of 8 stores' : undefined}
                className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-navy)] w-full bg-white disabled:opacity-50 disabled:bg-slate-50"
              >
                {storeOptionsForAdd.map((opt) => (
                  <option key={opt.value || 'hq'} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* Actions */}
            <div className="flex items-end gap-2">
              <Button type="submit" isLoading={submitting} className="flex-1 justify-center">
                Add User
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => { setShowAddForm(false); setError(null) }}
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* User table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[750px]">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-widest text-slate-400 w-52">Name</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-slate-400">Email</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-slate-400">Role</th>
                {isOps && <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-slate-400">Store</th>}
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-slate-400">Added</th>
                <th className="px-4 py-3 w-24" />
              </tr>
            </thead>
            <tbody>
              {userList.length === 0 && (
                <tr>
                  <td colSpan={isOps ? 6 : 5} className="px-5 py-12 text-center text-slate-400 text-sm">
                    No team members yet. Add one above.
                  </td>
                </tr>
              )}
              {userList.map((u) => {
                const store = u.storeId ? STORE_CONFIG.find((s) => s.id === u.storeId) : null
                const isEditing = editing?.id === u.id
                const isSelf = u.id === currentUser.id

                return (
                  <tr
                    key={u.id}
                    className={`border-b border-slate-50 transition-colors ${isEditing ? 'bg-blue-50/30' : 'hover:bg-slate-50/50'}`}
                  >
                    {/* Name */}
                    <td className="px-5 py-3">
                      {isEditing ? (
                        <input
                          autoFocus
                          value={editing.name}
                          onChange={(e) => updateEditing({ name: e.target.value })}
                          className="border border-slate-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-navy)] w-full"
                        />
                      ) : (
                        <div className="flex items-center gap-2.5">
                          <Avatar name={u.name} size="sm" color={store?.color ?? '#64748B'} />
                          <span className="text-sm font-medium text-slate-800">{u.name}</span>
                          {isSelf && <span className="text-xs text-slate-400">(you)</span>}
                        </div>
                      )}
                    </td>

                    {/* Email */}
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <input
                          type="email"
                          value={editing.email}
                          onChange={(e) => updateEditing({ email: e.target.value })}
                          className="border border-slate-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-navy)] w-full"
                        />
                      ) : (
                        <span className="text-sm text-slate-600">{u.email}</span>
                      )}
                    </td>

                    {/* Role — ops can edit anyone including self; leaders can edit only store users */}
                    <td className="px-4 py-3">
                      {isEditing && (!isSelf || isOps) ? (
                        <select
                          value={editing.role}
                          onChange={(e) => updateEditing({ role: e.target.value as EditingState['role'] })}
                          className="border border-slate-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-navy)] bg-white"
                        >
                          {availableRoles.map((r) => (
                            <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                          ))}
                        </select>
                      ) : (
                        <Chip label={u.role} variant={roleVariant(u.role)} />
                      )}
                    </td>

                    {/* Store (ops only) — 9 options: HQ + 8 stores */}
                    {isOps && (
                      <td className="px-4 py-3">
                        {isEditing && (!isSelf || isOps) ? (
                          editing.role === 'ops' ? (
                            <span className="text-sm font-medium text-slate-600">HQ</span>
                          ) : (
                            <select
                              value={editing.storeId ?? ''}
                              onChange={(e) => updateEditing({ storeId: e.target.value === '' ? null : parseInt(e.target.value) })}
                              className="border border-slate-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-navy)] bg-white"
                            >
                              <option value="">HQ</option>
                              {STORE_CONFIG.map((s) => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                              ))}
                            </select>
                          )
                        ) : (
                          <span className="text-sm text-slate-600">
                            {store ? (
                              <span className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: store.color }} />
                                {store.name}
                              </span>
                            ) : (
                              <span className="text-slate-600 font-medium">HQ</span>
                            )}
                          </span>
                        )}
                      </td>
                    )}

                    {/* Created */}
                    <td className="px-4 py-3 text-sm text-slate-400 whitespace-nowrap">
                      {format(new Date(u.createdAt), 'MMM d, yyyy')}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={saveEdit}
                            disabled={savingEdit}
                            title="Save"
                            className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={cancelEdit}
                            title="Cancel"
                            className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => startEdit(u)}
                            title="Edit"
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          {!isSelf && (
                            <button
                              onClick={() => handleDelete(u.id, u.name)}
                              disabled={deletingId === u.id}
                              title="Remove"
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-4 right-4 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-lg text-sm font-medium">
          {toast}
        </div>
      )}
    </div>
  )
}
