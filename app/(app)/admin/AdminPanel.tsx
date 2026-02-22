'use client'

import { useState, useEffect, useMemo } from 'react'
import { Trash2, UserPlus, Pencil, Check, X, Mail, User, Lock, Clock, Store, Users } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { Chip } from '@/components/ui/Chip'
import { Button } from '@/components/ui/Button'
import { STORE_CONFIG } from '@/lib/stores'
import type { User as DbUser } from '@/lib/db/schema'
import type { CurrentUser } from '@/lib/auth'
import { format } from 'date-fns'
import { ROLES, ROLE_LABELS, normalizeRole, adminSeesAllStores } from '@/lib/roles'
import type { Role } from '@/lib/roles'

const STORE_LEADER_ROLE_TYPES: Role[] = ['area_manager', 'store_leader']
const ASSOCIATE_ROLE_TYPES: Role[] = ['lead', 'associate']

interface AdminPanelProps {
  users: DbUser[]
  currentUser: CurrentUser
}

type EditingState = {
  id: string
  name: string
  email: string
  role: Role
  storeId: number | null
}

const STORE_LEADER_ROLES: Role[] = ['store_leader', 'lead', 'associate']

const roleVariant = (role: string): 'blue' | 'violet' | 'slate' | 'amber' => {
  const map: Record<string, 'blue' | 'violet' | 'slate' | 'amber'> = {
    ops: 'blue',
    area_manager: 'violet',
    store_leader: 'violet',
    lead: 'amber',
    associate: 'slate',
  }
  return map[normalizeRole(role)] ?? 'slate'
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
    role: 'associate' as Role,
    storeId: (currentUser.storeId ?? STORE_CONFIG[0].id) as number | null,
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [storeHoursStoreId, setStoreHoursStoreId] = useState<number>(STORE_CONFIG[0].id)
  const [storeHoursForm, setStoreHoursForm] = useState<Record<string, string>>({
    sun: '', mon: '', tue: '', wed: '', thu: '', fri: '', sat: '',
  })
  const [loadingStoreHours, setLoadingStoreHours] = useState(false)
  const [savingStoreHours, setSavingStoreHours] = useState(false)
  const [activeTab, setActiveTab] = useState<'dashboard' | 'management'>('dashboard')

  const seesAllStores = adminSeesAllStores(currentUser)

  useEffect(() => {
    if (!seesAllStores) return
    let cancelled = false
    setLoadingStoreHours(true)
    fetch(`/api/stores/${storeHoursStoreId}`)
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (cancelled || !data?.hours) return
        const h = data.hours as Record<string, string>
        setStoreHoursForm({
          sun: h.sun ?? '', mon: h.mon ?? '', tue: h.tue ?? '', wed: h.wed ?? '',
          thu: h.thu ?? '', fri: h.fri ?? '', sat: h.sat ?? '',
        })
      })
      .finally(() => { if (!cancelled) setLoadingStoreHours(false) })
    return () => { cancelled = true }
  }, [seesAllStores, storeHoursStoreId])

  async function saveStoreHours() {
    setSavingStoreHours(true)
    try {
      const res = await fetch(`/api/stores/${storeHoursStoreId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hours: storeHoursForm }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error ?? 'Failed to save')
      }
      showToast('Store hours saved. Schedule will use these as default.')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to save store hours')
    } finally {
      setSavingStoreHours(false)
    }
  }

  const availableRoles = seesAllStores ? [...ROLES] : STORE_LEADER_ROLES
  const storeOptionsForAdd = seesAllStores
    ? [{ value: '', label: 'HQ' }, ...STORE_CONFIG.map((s) => ({ value: String(s.id), label: s.name }))]
    : STORE_CONFIG.filter((s) => s.id === currentUser.storeId).map((s) => ({ value: String(s.id), label: s.name }))
  const storeOptionsAreaManagerOnly = STORE_CONFIG.map((s) => ({ value: String(s.id), label: s.name }))

  // Dashboard: 8 stores first (clean card view), then HQ at the bottom
  const dashboardByStore = useMemo(() => {
    const storeCards: { store: (typeof STORE_CONFIG)[number] | null; leaders: DbUser[]; associates: DbUser[] }[] = []
    for (const store of STORE_CONFIG) {
      const leaders = userList.filter(
        (u) => u.storeId === store.id && STORE_LEADER_ROLE_TYPES.includes(normalizeRole(u.role) as Role)
      )
      const associates = userList.filter(
        (u) => u.storeId === store.id && ASSOCIATE_ROLE_TYPES.includes(normalizeRole(u.role) as Role)
      )
      storeCards.push({ store, leaders, associates })
    }
    const hqUsers = userList.filter((u) => normalizeRole(u.role) === 'ops')
    if (hqUsers.length > 0) {
      storeCards.push({ store: null, leaders: hqUsers, associates: [] })
    }
    return storeCards
  }, [userList])

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
      role: normalizeRole(u.role) as Role,
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
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            {seesAllStores ? 'User Management' : 'My Store Team'}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {seesAllStores
              ? 'Dashboard overview and user management by tab.'
              : 'Add, edit, or remove team members at your store.'}
          </p>
        </div>
        <Button onClick={() => { setShowAddForm((v) => !v); setError(null); if (seesAllStores) setActiveTab('management') }}>
          <UserPlus className="w-4 h-4" />
          Add Member
        </Button>
      </div>

      {/* Tabs (OPS / Area Manager only) */}
      {seesAllStores && (
        <div className="flex gap-1 p-1 mb-6 rounded-xl bg-slate-100 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 w-fit">
          <button
            type="button"
            onClick={() => setActiveTab('dashboard')}
            className={`px-4 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
              activeTab === 'dashboard'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Store className="w-4 h-4" />
            Dashboard
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('management')}
            className={`px-4 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
              activeTab === 'management'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            User Management
          </button>
        </div>
      )}

      {/* Add user form (shown when open; only on User Management tab for OPS/AM) */}
      {showAddForm && (!seesAllStores || activeTab === 'management') && (
        <div className="bg-white dark:bg-slate-800/50 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-600 p-5 mb-6">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-4">New Team Member</h2>
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
                  className="border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white dark:placeholder-slate-400 rounded-xl pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-navy)] w-full"
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
                  className="border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white dark:placeholder-slate-400 rounded-xl pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-navy)] w-full"
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
                  className="border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white dark:placeholder-slate-400 rounded-xl pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-navy)] w-full"
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
                  const role = e.target.value as Role
                  setAddForm({
                    ...addForm,
                    role,
                    storeId: role === 'ops' ? null : (role === 'area_manager' ? (currentUser.storeId ?? STORE_CONFIG[0].id) : (currentUser.storeId ?? STORE_CONFIG[0].id)) as number | null,
                  })
                }}
                className="border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-navy)] w-full bg-white dark:bg-slate-700 dark:text-slate-100 appearance-none cursor-pointer"
              >
                {availableRoles.map((r) => (
                  <option key={r} value={r} className="bg-white dark:bg-slate-700 dark:text-slate-100">
                    {ROLE_LABELS[r]}
                  </option>
                ))}
              </select>
            </div>

            {/* Store — HQ for OPS only; Area Manager must pick a store; others by permission */}
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
                disabled={!seesAllStores && addForm.role !== 'ops' && addForm.role !== 'area_manager'}
                title={addForm.role === 'area_manager' ? 'Area Manager works from a store' : seesAllStores ? 'HQ or one of 8 stores' : undefined}
                className="border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-navy)] w-full bg-white dark:bg-slate-700 dark:text-white disabled:opacity-50 disabled:bg-slate-50 dark:disabled:bg-slate-800"
              >
                {addForm.role === 'ops' && <option value="">HQ</option>}
                {addForm.role === 'area_manager' && storeOptionsAreaManagerOnly.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
                {addForm.role !== 'ops' && addForm.role !== 'area_manager' && storeOptionsForAdd.map((opt) => (
                  <option key={opt.value || 'hq'} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              {addForm.role === 'area_manager' && <p className="text-xs text-slate-400 mt-1">Store this Area Manager works from</p>}
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

      {/* Tab: Dashboard (OPS / Area Manager only) — 8 stores in a clean card grid, HQ at bottom */}
      {seesAllStores && activeTab === 'dashboard' && (
        <div className="space-y-8">
          {/* Stores: clean card grid (all 8 stores) */}
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-4">Stores</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {dashboardByStore.filter((c) => c.store != null).map((card) => (
                <div
                  key={card.store!.id}
                  className="rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800/50 shadow-sm overflow-hidden"
                  style={{ borderLeftWidth: '4px', borderLeftColor: card.store!.color }}
                >
                  <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: card.store!.color }} />
                    <span className="font-semibold text-slate-900 dark:text-slate-100 text-sm">{card.store!.name}</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 truncate">{card.store!.city}</span>
                  </div>
                  <div className="p-3 space-y-4">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2">Leaders</p>
                      {card.leaders.length === 0 ? (
                        <p className="text-xs text-slate-400 dark:text-slate-500 italic">None</p>
                      ) : (
                        <ul className="space-y-1.5">
                          {card.leaders.map((u) => (
                            <li key={u.id} className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 group">
                              <Avatar name={u.name} size="sm" color={card.store!.color} />
                              <div className="flex-1 min-w-0">
                                <span className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate block">{u.name}</span>
                                <Chip label={ROLE_LABELS[normalizeRole(u.role) as Role]} variant={roleVariant(u.role)} className="mt-0.5" />
                              </div>
                              {editing?.id === u.id ? (
                                <div className="flex gap-0.5">
                                  <button type="button" onClick={saveEdit} disabled={savingEdit} className="p-1.5 text-green-600 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20" title="Save"><Check className="w-3.5 h-3.5" /></button>
                                  <button type="button" onClick={cancelEdit} className="p-1.5 text-slate-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-600" title="Cancel"><X className="w-3.5 h-3.5" /></button>
                                </div>
                              ) : (
                                <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button type="button" onClick={() => startEdit(u)} className="p-1.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20" title="Edit"><Pencil className="w-3.5 h-3.5" /></button>
                                  {u.id !== currentUser.id && (
                                    <button type="button" onClick={() => handleDelete(u.id, u.name)} disabled={deletingId === u.id} className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50" title="Remove"><Trash2 className="w-3.5 h-3.5" /></button>
                                  )}
                                </div>
                              )}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2">Associates</p>
                      {card.associates.length === 0 ? (
                        <p className="text-xs text-slate-400 dark:text-slate-500 italic">None</p>
                      ) : (
                        <ul className="space-y-1.5">
                          {card.associates.map((u) => (
                            <li key={u.id} className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 group">
                              <Avatar name={u.name} size="sm" color={card.store!.color} />
                              <div className="flex-1 min-w-0">
                                <span className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate block">{u.name}</span>
                                <Chip label={ROLE_LABELS[normalizeRole(u.role) as Role]} variant={roleVariant(u.role)} className="mt-0.5" />
                              </div>
                              {editing?.id === u.id ? (
                                <div className="flex gap-0.5">
                                  <button type="button" onClick={saveEdit} disabled={savingEdit} className="p-1.5 text-green-600 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20" title="Save"><Check className="w-3.5 h-3.5" /></button>
                                  <button type="button" onClick={cancelEdit} className="p-1.5 text-slate-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-600" title="Cancel"><X className="w-3.5 h-3.5" /></button>
                                </div>
                              ) : (
                                <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button type="button" onClick={() => startEdit(u)} className="p-1.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20" title="Edit"><Pencil className="w-3.5 h-3.5" /></button>
                                  {u.id !== currentUser.id && (
                                    <button type="button" onClick={() => handleDelete(u.id, u.name)} disabled={deletingId === u.id} className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50" title="Remove"><Trash2 className="w-3.5 h-3.5" /></button>
                                  )}
                                </div>
                              )}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* HQ card at the bottom */}
          {dashboardByStore.some((c) => c.store == null) && (
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-4">HQ</h2>
              <div className="max-w-2xl">
                {dashboardByStore.filter((c) => c.store == null).map((card) => (
                  <div
                    key="hq"
                    className="rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800/50 shadow-sm overflow-hidden"
                  >
                    <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 flex items-center gap-2">
                      <Users className="w-4 h-4 text-slate-500 flex-shrink-0" />
                      <span className="font-semibold text-slate-900 dark:text-slate-100 text-sm">HQ</span>
                    </div>
                    <div className="p-3">
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2">OPS</p>
                      {card.leaders.length === 0 ? (
                        <p className="text-xs text-slate-400 dark:text-slate-500 italic">None</p>
                      ) : (
                        <ul className="space-y-1.5">
                          {card.leaders.map((u) => (
                            <li key={u.id} className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 group">
                              <Avatar name={u.name} size="sm" color="#64748B" />
                              <div className="flex-1 min-w-0">
                                <span className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate block">{u.name}</span>
                                <Chip label={ROLE_LABELS[normalizeRole(u.role) as Role]} variant={roleVariant(u.role)} className="mt-0.5" />
                              </div>
                              {editing?.id === u.id ? (
                                <div className="flex gap-0.5">
                                  <button type="button" onClick={saveEdit} disabled={savingEdit} className="p-1.5 text-green-600 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20" title="Save"><Check className="w-3.5 h-3.5" /></button>
                                  <button type="button" onClick={cancelEdit} className="p-1.5 text-slate-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-600" title="Cancel"><X className="w-3.5 h-3.5" /></button>
                                </div>
                              ) : (
                                <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button type="button" onClick={() => startEdit(u)} className="p-1.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20" title="Edit"><Pencil className="w-3.5 h-3.5" /></button>
                                  {u.id !== currentUser.id && (
                                    <button type="button" onClick={() => handleDelete(u.id, u.name)} disabled={deletingId === u.id} className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50" title="Remove"><Trash2 className="w-3.5 h-3.5" /></button>
                                  )}
                                </div>
                              )}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab: User Management (table + add form) — or only view for Store Leader */}
      {(!seesAllStores || activeTab === 'management') && (
      <div>
      <div className="bg-white dark:bg-slate-800/50 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-600 overflow-hidden">
        {seesAllStores && (
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200 px-5 py-3 border-b border-slate-100 dark:border-slate-700">
            All users · Add, edit, or delete
          </h2>
        )}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[750px]">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50">
                <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-300 w-52">Name</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-300">Email</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-300">Role</th>
                {seesAllStores && <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-300">Store</th>}
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-300">Added</th>
                <th className="px-4 py-3 w-24" />
              </tr>
            </thead>
            <tbody>
              {userList.length === 0 && (
                <tr>
                  <td colSpan={seesAllStores ? 6 : 5} className="px-5 py-12 text-center text-slate-400 dark:text-slate-400 text-sm">
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
                    className={`border-b border-slate-50 dark:border-slate-700 transition-colors ${isEditing ? 'bg-blue-50/30 dark:bg-blue-900/20' : 'hover:bg-slate-50/50 dark:hover:bg-slate-700/30'}`}
                  >
                    {/* Name */}
                    <td className="px-5 py-3">
                      {isEditing ? (
                        <input
                          autoFocus
                          value={editing.name}
                          onChange={(e) => updateEditing({ name: e.target.value })}
                          className="border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-navy)] w-full"
                        />
                      ) : (
                        <div className="flex items-center gap-2.5">
                          <Avatar name={u.name} size="sm" color={store?.color ?? '#64748B'} />
                          <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{u.name}</span>
                          {isSelf && <span className="text-xs text-slate-400 dark:text-slate-500">(you)</span>}
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
                          className="border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-navy)] w-full"
                        />
                      ) : (
                        <span className="text-sm text-slate-600 dark:text-slate-300">{u.email}</span>
                      )}
                    </td>

                    {/* Role — ops can edit anyone including self; leaders can edit only store users */}
                    <td className="px-4 py-3">
                      {isEditing && (!isSelf || seesAllStores) ? (
                        <select
                          value={editing.role}
                          onChange={(e) => updateEditing({ role: e.target.value as EditingState['role'] })}
                          className="border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-navy)] bg-white dark:bg-slate-700 dark:text-white"
                        >
                          {availableRoles.map((r) => (
                            <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                          ))}
                        </select>
                      ) : (
                        <Chip label={u.role} variant={roleVariant(u.role)} />
                      )}
                    </td>

                    {/* Store (ops only) — 9 options: HQ + 8 stores */}
                    {seesAllStores && (
                      <td className="px-4 py-3">
                        {isEditing && (!isSelf || seesAllStores) ? (
                          editing.role === 'ops' ? (
                            <span className="text-sm font-medium text-slate-600 dark:text-slate-400">HQ</span>
                          ) : (
                            <select
                              value={editing.storeId ?? ''}
                              onChange={(e) => updateEditing({ storeId: e.target.value === '' ? null : parseInt(e.target.value) })}
                              className="border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-navy)] bg-white dark:bg-slate-700 dark:text-white"
                            >
                              {editing.role === 'area_manager' ? null : <option value="">HQ</option>}
                              {STORE_CONFIG.map((s) => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                              ))}
                            </select>
                          )
                        ) : (
                            <span className="text-sm text-slate-600 dark:text-slate-300">
                            {store ? (
                              <span className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: store.color }} />
                                {store.name}
                              </span>
                            ) : (
                              <span className="text-slate-600 dark:text-slate-300 font-medium">HQ</span>
                            )}
                          </span>
                        )}
                      </td>
                    )}

                    {/* Created */}
                    <td className="px-4 py-3 text-sm text-slate-400 dark:text-slate-400 whitespace-nowrap">
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
                            className="p-1.5 text-slate-400 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600 rounded-lg transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => startEdit(u)}
                            title="Edit"
                            className="p-1.5 text-slate-400 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/20 rounded-lg transition-colors"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          {!isSelf && (
                            <button
                              onClick={() => handleDelete(u.id, u.name)}
                              disabled={deletingId === u.id}
                              title="Remove"
                              className="p-1.5 text-slate-400 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/20 rounded-lg transition-colors disabled:opacity-50"
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

      {/* Store hours (ops only) */}
      {seesAllStores && (
        <div className="mt-8 bg-white dark:bg-slate-800/50 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-600 p-5">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-1 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Store hours (standard)
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
            Default hours per day for the schedule. Changes apply to the schedule view. For a specific week override, use “Edit hours for this week” on the Schedule page.
          </p>
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-widest text-slate-400 block mb-1.5">Store</label>
              <select
                value={storeHoursStoreId}
                onChange={(e) => setStoreHoursStoreId(Number(e.target.value))}
                className="border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[var(--brand-navy)] min-w-[180px]"
              >
                {STORE_CONFIG.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            {(['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const).map((day) => (
              <div key={day} className="w-28">
                <label className="text-xs font-semibold uppercase tracking-widest text-slate-400 block mb-1.5">{day}</label>
                <input
                  type="text"
                  value={storeHoursForm[day] ?? ''}
                  onChange={(e) => setStoreHoursForm((prev) => ({ ...prev, [day]: e.target.value }))}
                  placeholder="11AM–7PM"
                  className="border border-slate-200 dark:border-slate-600 rounded-xl px-2 py-2 text-sm bg-white dark:bg-slate-700 dark:text-slate-100 placeholder-slate-400 w-full focus:outline-none focus:ring-2 focus:ring-[var(--brand-navy)]"
                />
              </div>
            ))}
            <Button onClick={saveStoreHours} isLoading={savingStoreHours} disabled={loadingStoreHours}>
              Save hours
            </Button>
          </div>
        </div>
      )}
      </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-4 right-4 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-lg text-sm font-medium">
          {toast}
        </div>
      )}
    </div>
  )
}
