'use client'

import { useState } from 'react'
import { CheckCircle } from 'lucide-react'
import { STORE_CONFIG } from '@/lib/stores'
import { Button } from '@/components/ui/Button'

const REQUEST_TYPES = ['RTO', 'PTO', 'COMP', 'Sick'] as const
type RequestType = (typeof REQUEST_TYPES)[number]

interface RTOSubmitFormProps {
  defaultStoreId?: number
}

export function RTOSubmitForm({ defaultStoreId }: RTOSubmitFormProps) {
  const [form, setForm] = useState({
    employeeName: '',
    storeId: defaultStoreId ?? STORE_CONFIG[0].id,
    type: 'RTO' as RequestType,
    requestedDays: '',
    partialTime: '',
    employeeEmail: '',
    note: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch('/api/rto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeId: form.storeId,
          employeeName: form.employeeName,
          employeeEmail: form.employeeEmail,
          requestedDays: form.requestedDays,
          type: form.type,
          partialTime: form.partialTime || undefined,
          note: form.note || undefined,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Submission failed')
      }

      setSuccess(true)
      setTimeout(() => {
        setSuccess(false)
        setForm({
          employeeName: '',
          storeId: defaultStoreId ?? STORE_CONFIG[0].id,
          type: 'RTO',
          requestedDays: '',
          partialTime: '',
          employeeEmail: '',
          note: '',
        })
      }, 4000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  const showPartialTime = form.type !== 'COMP' && form.type !== 'Sick'

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
        <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Request Submitted</h2>
        <p className="text-slate-500 max-w-sm text-sm">
          Your request has been submitted. Your store leader will review it and you will receive an email notification.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
          {error}
        </div>
      )}

      {/* Name */}
      <div>
        <label className="text-xs font-semibold uppercase tracking-widest text-slate-400 block mb-1.5">
          Full Name
        </label>
        <input
          type="text"
          required
          value={form.employeeName}
          onChange={(e) => setForm({ ...form, employeeName: e.target.value })}
          placeholder="Your full name"
          className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-navy)] w-full"
        />
      </div>

      {/* Store */}
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

      {/* Request type */}
      <div>
        <label className="text-xs font-semibold uppercase tracking-widest text-slate-400 block mb-1.5">
          Request Type
        </label>
        <div className="flex gap-2 flex-wrap">
          {REQUEST_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setForm({ ...form, type: t })}
              className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-colors ${
                form.type === t
                  ? 'bg-[var(--brand-navy)] text-white border-transparent'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Requested days */}
      <div>
        <label className="text-xs font-semibold uppercase tracking-widest text-slate-400 block mb-1.5">
          Requested Days
        </label>
        <input
          type="text"
          required
          value={form.requestedDays}
          onChange={(e) => setForm({ ...form, requestedDays: e.target.value })}
          placeholder="e.g. Mar 15  or  Mar 22–23"
          className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-navy)] w-full"
        />
      </div>

      {/* Partial time (optional, hidden for COMP and Sick) */}
      {showPartialTime && (
        <div>
          <label className="text-xs font-semibold uppercase tracking-widest text-slate-400 block mb-1.5">
            Partial Time <span className="text-slate-300 font-normal normal-case tracking-normal">optional</span>
          </label>
          <input
            type="text"
            value={form.partialTime}
            onChange={(e) => setForm({ ...form, partialTime: e.target.value })}
            placeholder="e.g. 10AM–2PM"
            className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-navy)] w-full"
          />
        </div>
      )}

      {/* Email */}
      <div>
        <label className="text-xs font-semibold uppercase tracking-widest text-slate-400 block mb-1.5">
          Email Address
        </label>
        <input
          type="email"
          required
          value={form.employeeEmail}
          onChange={(e) => setForm({ ...form, employeeEmail: e.target.value })}
          placeholder="you@example.com"
          className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-navy)] w-full"
        />
      </div>

      {/* Notes */}
      <div>
        <label className="text-xs font-semibold uppercase tracking-widest text-slate-400 block mb-1.5">
          Notes <span className="text-slate-300 font-normal normal-case tracking-normal">optional</span>
        </label>
        <textarea
          value={form.note}
          onChange={(e) => setForm({ ...form, note: e.target.value })}
          placeholder="Any additional context..."
          rows={3}
          className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-navy)] w-full resize-none"
        />
      </div>

      <Button type="submit" isLoading={submitting} className="w-full justify-center">
        Submit Request
      </Button>
    </form>
  )
}
