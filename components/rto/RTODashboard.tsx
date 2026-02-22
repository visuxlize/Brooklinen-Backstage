'use client'

import { useState, useEffect } from 'react'
import { Check, X, RotateCcw, ExternalLink, Trash2, Calendar, Clock, Mail } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { RTOStatusBadge } from './RTOStatusBadge'
import { Button } from '@/components/ui/Button'
import type { StoreConfig } from '@/lib/stores'
import { RTO_SUBMIT_URL } from '@/lib/app-config'
import { cn } from '@/lib/utils'

interface RtoRequest {
  id: string
  storeId: number
  employeeName: string
  employeeEmail: string
  requestedDays: string
  type: string
  partialTime: string | null
  note: string | null
  status: string
  leaderNote: string | null
  createdAt: string
  updatedAt: string
}

interface RTODashboardProps {
  store: StoreConfig
  currentUser: { role: string }
}

type TabId = 'pending' | 'approved' | 'denied'

const TABS: { id: TabId; label: string; statusFilter: string[] }[] = [
  { id: 'pending', label: 'Pending', statusFilter: ['pending'] },
  { id: 'approved', label: 'Approved', statusFilter: ['approved'] },
  { id: 'denied', label: 'Denied', statusFilter: ['denied'] },
]

export function RTODashboard({ store, currentUser }: RTODashboardProps) {
  const [requests, setRequests] = useState<RtoRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabId>('pending')
  const [actionState, setActionState] = useState<Record<string, 'idle' | 'loading'>>({})
  const [noteInputs, setNoteInputs] = useState<Record<string, string>>({})
  const [confirmAction, setConfirmAction] = useState<Record<string, 'approve' | 'deny' | 'undo' | 'delete' | null>>({})

  async function fetchRequests() {
    setLoading(true)
    try {
      const res = await fetch(`/api/rto?storeId=${store.id}`)
      if (res.ok) {
        const { data } = await res.json()
        setRequests(data)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRequests()
  }, [store.id])

  async function handleApprove(id: string) {
    setActionState((p) => ({ ...p, [id]: 'loading' }))
    try {
      const res = await fetch(`/api/rto/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'approved', leaderNote: noteInputs[id] ?? '' }),
      })
      if (res.ok) {
        setConfirmAction((p) => ({ ...p, [id]: null }))
        setNoteInputs((p) => ({ ...p, [id]: '' }))
        await fetchRequests()
      }
    } finally {
      setActionState((p) => ({ ...p, [id]: 'idle' }))
    }
  }

  async function handleDeny(id: string) {
    setActionState((p) => ({ ...p, [id]: 'loading' }))
    try {
      const res = await fetch(`/api/rto/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'denied', leaderNote: noteInputs[id] ?? '' }),
      })
      if (res.ok) {
        setConfirmAction((p) => ({ ...p, [id]: null }))
        setNoteInputs((p) => ({ ...p, [id]: '' }))
        await fetchRequests()
      }
    } finally {
      setActionState((p) => ({ ...p, [id]: 'idle' }))
    }
  }

  async function handleUndo(id: string) {
    setActionState((p) => ({ ...p, [id]: 'loading' }))
    try {
      const res = await fetch(`/api/rto/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'pending', leaderNote: '' }),
      })
      if (res.ok) {
        setConfirmAction((p) => ({ ...p, [id]: null }))
        await fetchRequests()
      }
    } finally {
      setActionState((p) => ({ ...p, [id]: 'idle' }))
    }
  }

  async function handleDelete(id: string) {
    setActionState((p) => ({ ...p, [id]: 'loading' }))
    try {
      const res = await fetch(`/api/rto/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setConfirmAction((p) => ({ ...p, [id]: null }))
        await fetchRequests()
      }
    } finally {
      setActionState((p) => ({ ...p, [id]: 'idle' }))
    }
  }

  const filtered = requests.filter((r) => TABS.find((t) => t.id === activeTab)?.statusFilter.includes(r.status))
  const pendingCount = requests.filter((r) => r.status === 'pending').length
  const approvedCount = requests.filter((r) => r.status === 'approved').length
  const deniedCount = requests.filter((r) => r.status === 'denied').length

  const typeStyles: Record<string, string> = {
    RTO: 'bg-slate-100 text-slate-700 dark:bg-slate-600 dark:text-slate-200',
    PTO: 'bg-blue-50 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200',
    Partial: 'bg-violet-50 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200',
    COMP: 'bg-violet-50 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200',
    Sick: 'bg-amber-50 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
  }
  const typeLabel = (type: string) => (type === 'Partial' ? 'Partial Time Off' : type)

  return (
    <div className="min-h-screen bg-[var(--surface)]">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Time Off Requests</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                {store.name} · {store.city}
              </p>
            </div>
            <a
              href={RTO_SUBMIT_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 shadow-md"
              style={{ backgroundColor: 'var(--brand-navy)' }}
            >
              <ExternalLink className="w-4 h-4" />
              Open submission form
            </a>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-6 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl w-fit">
            {TABS.map((tab) => {
              const count =
                tab.id === 'pending' ? pendingCount : tab.id === 'approved' ? approvedCount : deniedCount
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'px-4 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-2',
                    activeTab === tab.id
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  )}
                >
                  {tab.label}
                  {count > 0 && (
                    <span
                      className={cn(
                        'min-w-[1.25rem] h-5 px-1.5 flex items-center justify-center rounded-full text-xs font-bold',
                        activeTab === tab.id
                          ? 'bg-[var(--brand-navy)]/15 text-[var(--brand-navy)] dark:bg-white/20 dark:text-white'
                          : 'bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300'
                      )}
                    >
                      {count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-6 py-8">
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-44 bg-slate-100 dark:bg-slate-800 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800/50 p-12 text-center">
            <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-7 h-7 text-slate-400 dark:text-slate-500" />
            </div>
            <p className="text-slate-600 dark:text-slate-300 font-medium">No {activeTab} requests</p>
            <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">
              {activeTab === 'pending'
                ? 'New requests from associates will appear here.'
                : `No ${activeTab} requests to show.`}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {filtered.map((req) => {
              const state = actionState[req.id] ?? 'idle'
              const confirm = confirmAction[req.id]
              const isLoading = state === 'loading'

              return (
                <div
                  key={req.id}
                  className="rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800/50 shadow-sm overflow-hidden transition-shadow hover:shadow-md"
                >
                  <div className="p-5">
                    <div className="flex items-start gap-4">
                      <Avatar name={req.employeeName} size="lg" color={store.color} />
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-slate-900 dark:text-slate-100">{req.employeeName}</span>
                          <span
                            className={cn(
                              'text-xs font-semibold px-2.5 py-1 rounded-full',
                              typeStyles[req.type] ?? typeStyles.RTO
                            )}
                          >
                            {typeLabel(req.type)}
                          </span>
                          <RTOStatusBadge status={req.status as 'approved' | 'denied' | 'pending'} />
                        </div>
                        <div className="flex items-center gap-1.5 mt-2 text-sm text-slate-500 dark:text-slate-400">
                          <Calendar className="w-3.5 h-3.5 shrink-0" />
                          {req.requestedDays}
                        </div>
                        {req.partialTime && (
                          <div className="flex items-center gap-1.5 mt-1 text-sm text-slate-500 dark:text-slate-400">
                            <Clock className="w-3.5 h-3.5 shrink-0" />
                            {req.partialTime}
                          </div>
                        )}
                        <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-400 dark:text-slate-500">
                          <Mail className="w-3 h-3 shrink-0" />
                          {req.employeeEmail}
                        </div>
                        {req.note && (
                          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 italic">&ldquo;{req.note}&rdquo;</p>
                        )}
                        {req.leaderNote && req.status !== 'pending' && (
                          <div className="mt-2 text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-700/50 rounded-lg px-3 py-2">
                            Leader note: {req.leaderNote}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-700 space-y-3">
                      {req.status === 'pending' && (
                        <>
                          {confirm === 'approve' && (
                            <div className="space-y-2">
                              <input
                                type="text"
                                value={noteInputs[req.id] ?? ''}
                                onChange={(e) => setNoteInputs((p) => ({ ...p, [req.id]: e.target.value }))}
                                placeholder="Optional note to employee..."
                                className="w-full border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-navy)]"
                              />
                              <div className="flex gap-2">
                                <Button
                                  variant="success"
                                  size="sm"
                                  isLoading={isLoading}
                                  onClick={() => handleApprove(req.id)}
                                  className="flex-1 justify-center"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  Confirm approve
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setConfirmAction((p) => ({ ...p, [req.id]: null }))}
                                  disabled={isLoading}
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          )}
                          {confirm === 'deny' && (
                            <div className="space-y-2">
                              <input
                                type="text"
                                value={noteInputs[req.id] ?? ''}
                                onChange={(e) => setNoteInputs((p) => ({ ...p, [req.id]: e.target.value }))}
                                placeholder="Optional note to employee..."
                                className="w-full border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-navy)]"
                              />
                              <div className="flex gap-2">
                                <Button
                                  variant="danger"
                                  size="sm"
                                  isLoading={isLoading}
                                  onClick={() => handleDeny(req.id)}
                                  className="flex-1 justify-center"
                                >
                                  <X className="w-3.5 h-3.5" />
                                  Confirm deny
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setConfirmAction((p) => ({ ...p, [req.id]: null }))}
                                  disabled={isLoading}
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          )}
                          {confirm === 'delete' && (
                            <div className="flex gap-2">
                              <Button
                                variant="danger"
                                size="sm"
                                isLoading={isLoading}
                                onClick={() => handleDelete(req.id)}
                                className="flex-1 justify-center"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                Yes, delete
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setConfirmAction((p) => ({ ...p, [req.id]: null }))}
                                disabled={isLoading}
                              >
                                Cancel
                              </Button>
                            </div>
                          )}
                          {!confirm && (
                            <div className="flex gap-2 flex-wrap">
                              <Button
                                variant="success"
                                size="sm"
                                onClick={() => setConfirmAction((p) => ({ ...p, [req.id]: 'approve' }))}
                                className="flex-1 min-w-[100px] justify-center"
                              >
                                <Check className="w-3.5 h-3.5" />
                                Approve
                              </Button>
                              <Button
                                variant="danger"
                                size="sm"
                                onClick={() => setConfirmAction((p) => ({ ...p, [req.id]: 'deny' }))}
                                className="flex-1 min-w-[100px] justify-center"
                              >
                                <X className="w-3.5 h-3.5" />
                                Deny
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setConfirmAction((p) => ({ ...p, [req.id]: 'delete' }))}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                Delete
                              </Button>
                            </div>
                          )}
                        </>
                      )}

                      {(req.status === 'approved' || req.status === 'denied') && (
                        <>
                          {confirm === 'undo' && (
                            <div className="flex gap-2">
                              <Button
                                variant="secondary"
                                size="sm"
                                isLoading={isLoading}
                                onClick={() => handleUndo(req.id)}
                                className="flex-1 justify-center"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                                Yes, undo
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setConfirmAction((p) => ({ ...p, [req.id]: null }))}
                                disabled={isLoading}
                              >
                                Cancel
                              </Button>
                            </div>
                          )}
                          {confirm === 'delete' && (
                            <div className="flex gap-2">
                              <Button
                                variant="danger"
                                size="sm"
                                isLoading={isLoading}
                                onClick={() => handleDelete(req.id)}
                                className="flex-1 justify-center"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                Yes, delete
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setConfirmAction((p) => ({ ...p, [req.id]: null }))}
                                disabled={isLoading}
                              >
                                Cancel
                              </Button>
                            </div>
                          )}
                          {!confirm && (
                            <div className="flex gap-2 flex-wrap">
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => setConfirmAction((p) => ({ ...p, [req.id]: 'undo' }))}
                                className="flex-1 min-w-[100px] justify-center"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                                Undo
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setConfirmAction((p) => ({ ...p, [req.id]: 'delete' }))}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                Delete
                              </Button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
