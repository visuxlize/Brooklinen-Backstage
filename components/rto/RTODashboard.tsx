'use client'

import { useState, useEffect } from 'react'
import { Check, X, RotateCcw, Copy, CheckCheck } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import { RTOStatusBadge } from './RTOStatusBadge'
import { Button } from '@/components/ui/Button'
import type { StoreConfig } from '@/lib/stores'

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

export function RTODashboard({ store, currentUser }: RTODashboardProps) {
  const [requests, setRequests] = useState<RtoRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [actionState, setActionState] = useState<Record<string, 'idle' | 'approving' | 'denying' | 'loading'>>({})
  const [noteInputs, setNoteInputs] = useState<Record<string, string>>({})
  const [activeAction, setActiveAction] = useState<Record<string, 'approve' | 'deny' | null>>({})
  const [copied, setCopied] = useState(false)

  const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/rto/submit?store=${store.id}`

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

  async function handleAction(id: string, status: 'approved' | 'denied' | 'pending') {
    setActionState((prev) => ({ ...prev, [id]: 'loading' }))
    try {
      const res = await fetch(`/api/rto/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, leaderNote: noteInputs[id] ?? '' }),
      })
      if (res.ok) {
        await fetchRequests()
        setActiveAction((prev) => ({ ...prev, [id]: null }))
        setNoteInputs((prev) => ({ ...prev, [id]: '' }))
      }
    } finally {
      setActionState((prev) => ({ ...prev, [id]: 'idle' }))
    }
  }

  function handleCopyLink() {
    navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const pending = requests.filter((r) => r.status === 'pending')
  const resolved = requests.filter((r) => r.status !== 'pending')

  const typeVariant = (type: string) => {
    const map: Record<string, string> = {
      RTO: 'bg-slate-100 text-slate-700',
      PTO: 'bg-blue-50 text-blue-800',
      COMP: 'bg-violet-50 text-violet-800',
      Sick: 'bg-amber-50 text-amber-800',
    }
    return map[type] ?? 'bg-slate-100 text-slate-700'
  }

  function RequestCard({ req, showActions }: { req: RtoRequest; showActions: boolean }) {
    const action = activeAction[req.id]
    const state = actionState[req.id] ?? 'idle'

    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
        <div className="flex items-start gap-3 mb-3">
          <Avatar name={req.employeeName} size="md" color={store.color} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-slate-900 text-sm">{req.employeeName}</span>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${typeVariant(req.type)}`}>
                {req.type}
              </span>
              {!showActions && <RTOStatusBadge status={req.status as 'approved' | 'denied' | 'pending'} />}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">{req.requestedDays}</div>
            {req.partialTime && (
              <div className="text-xs text-slate-400">{req.partialTime}</div>
            )}
            {req.note && (
              <div className="text-xs text-slate-500 mt-1 italic">&ldquo;{req.note}&rdquo;</div>
            )}
            {req.leaderNote && !showActions && (
              <div className="text-xs text-slate-600 mt-1 bg-slate-50 rounded-lg px-2 py-1">
                Leader note: {req.leaderNote}
              </div>
            )}
          </div>
        </div>

        {showActions && (
          <>
            {action && (
              <div className="mb-3">
                <input
                  type="text"
                  value={noteInputs[req.id] ?? ''}
                  onChange={(e) => setNoteInputs((prev) => ({ ...prev, [req.id]: e.target.value }))}
                  placeholder="Optional note to employee..."
                  className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-navy)] w-full mb-2"
                />
                <div className="flex gap-2">
                  <Button
                    variant="success"
                    size="sm"
                    isLoading={state === 'loading' && action === 'approve'}
                    onClick={() => handleAction(req.id, 'approved')}
                    className="flex-1 justify-center"
                    disabled={action !== 'approve'}
                  >
                    <Check className="w-3.5 h-3.5" />
                    Confirm Approve
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    isLoading={state === 'loading' && action === 'deny'}
                    onClick={() => handleAction(req.id, 'denied')}
                    className="flex-1 justify-center"
                    disabled={action !== 'deny'}
                  >
                    <X className="w-3.5 h-3.5" />
                    Confirm Deny
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setActiveAction((prev) => ({ ...prev, [req.id]: null }))}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {!action && (
              <div className="flex gap-2">
                <Button
                  variant="success"
                  size="sm"
                  onClick={() => setActiveAction((prev) => ({ ...prev, [req.id]: 'approve' }))}
                  className="flex-1 justify-center"
                >
                  <Check className="w-3.5 h-3.5" />
                  Approve
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => setActiveAction((prev) => ({ ...prev, [req.id]: 'deny' }))}
                  className="flex-1 justify-center"
                >
                  <X className="w-3.5 h-3.5" />
                  Deny
                </Button>
              </div>
            )}
          </>
        )}

        {!showActions && (
          <Button
            variant="ghost"
            size="sm"
            isLoading={state === 'loading'}
            onClick={() => handleAction(req.id, 'pending')}
            className="mt-2"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Undo
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">RTO Management</h1>
        <p className="text-sm text-slate-500 mt-1">{store.name} · {store.city}</p>
      </div>

      {/* Shareable link */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 mb-6 flex items-center gap-3 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-1">
            Associate Submission Link
          </div>
          <div className="text-sm text-slate-600 font-mono truncate">{shareUrl}</div>
        </div>
        <Button variant="ghost" size="sm" onClick={handleCopyLink}>
          {copied ? <CheckCheck className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
          {copied ? 'Copied!' : 'Copy'}
        </Button>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Pending */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-sm font-semibold text-slate-800">Pending</h2>
            {pending.length > 0 && (
              <span className="bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {pending.length}
              </span>
            )}
          </div>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-32 bg-slate-100 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : pending.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 text-center text-slate-400 text-sm">
              No pending requests
            </div>
          ) : (
            <div className="space-y-3">
              {pending.map((req) => (
                <RequestCard key={req.id} req={req} showActions />
              ))}
            </div>
          )}
        </div>

        {/* Resolved */}
        <div>
          <h2 className="text-sm font-semibold text-slate-800 mb-4">Resolved</h2>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="h-28 bg-slate-100 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : resolved.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 text-center text-slate-400 text-sm">
              No resolved requests
            </div>
          ) : (
            <div className="space-y-3">
              {resolved.map((req) => (
                <RequestCard key={req.id} req={req} showActions={false} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
