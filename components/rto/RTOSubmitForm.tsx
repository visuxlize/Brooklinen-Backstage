'use client'

import { useState } from 'react'
import { CheckCircle, Clock, Calendar } from 'lucide-react'
import { STORE_CONFIG } from '@/lib/stores'
import { Button } from '@/components/ui/Button'

const REQUEST_TYPES = [
  { value: 'RTO' as const, label: 'RTO', description: 'Requested time off' },
  { value: 'PTO' as const, label: 'PTO', description: 'Paid time off' },
  { value: 'Partial' as const, label: 'Partial Time Off', description: 'Specify start & end times' },
] as const
type RequestType = (typeof REQUEST_TYPES)[number]['value']

interface RTOSubmitFormProps {
  defaultStoreId?: number
}

export function RTOSubmitForm({ defaultStoreId }: RTOSubmitFormProps) {
  const [form, setForm] = useState({
    employeeName: '',
    storeId: defaultStoreId ?? STORE_CONFIG[0].id,
    type: 'RTO' as RequestType,
    requestedDays: '',
    partialStart: '',
    partialEnd: '',
    employeeEmail: '',
    note: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isPartial = form.type === 'Partial'
  const partialTimeDisplay = [form.partialStart, form.partialEnd].filter(Boolean).join(' – ')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (isPartial && (!form.partialStart.trim() || !form.partialEnd.trim())) {
      setError('Partial Time Off requires both start and end times.')
      return
    }
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
          partialTime: isPartial ? partialTimeDisplay : undefined,
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
          partialStart: '',
          partialEnd: '',
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

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
        <div className="w-16 h-16 bg-green-50 dark:bg-green-900/40 rounded-full flex items-center justify-center">
          <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Request Submitted</h2>
        <p className="text-slate-500 dark:text-slate-400 max-w-sm text-sm">
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
          className="border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white dark:placeholder-slate-400 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-navy)] w-full"
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
          className="border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-navy)] w-full bg-white"
        >
          {STORE_CONFIG.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} — {s.city}
            </option>
          ))}
        </select>
      </div>

      {/* Request type: RTO, PTO, or Partial Time Off */}
      <div>
        <label className="text-xs font-semibold uppercase tracking-widest text-slate-400 block mb-1.5">
          Request Type
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {REQUEST_TYPES.map(({ value, label, description }) => (
            <button
              key={value}
              type="button"
              onClick={() => setForm({ ...form, type: value })}
              className={`text-left px-4 py-3 rounded-xl text-sm font-semibold border-2 transition-all ${
                form.type === value
                  ? 'border-[var(--brand-navy)] bg-[var(--brand-navy)]/5 text-[var(--brand-navy)] dark:bg-[var(--brand-navy)]/20 dark:text-blue-200'
                  : 'border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-500 hover:bg-slate-100 dark:hover:bg-slate-600'
              }`}
            >
              <span className="block">{label}</span>
              <span className="text-xs font-normal text-slate-500 dark:text-slate-400 mt-0.5 block">{description}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Requested days */}
      <div>
        <label className="text-xs font-semibold uppercase tracking-widest text-slate-400 block mb-1.5">
          <span className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            Requested Days
          </span>
        </label>
        <input
          type="text"
          required
          value={form.requestedDays}
          onChange={(e) => setForm({ ...form, requestedDays: e.target.value })}
          placeholder="e.g. Mar 15  or  Mar 22–23"
          className="border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white dark:placeholder-slate-400 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-navy)] w-full"
        />
      </div>

      {/* Partial time: required when type is Partial */}
      {isPartial && (
        <div className="bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl p-4 space-y-3">
          <label className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            Time needed (required for Partial Time Off)
          </label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="text-xs text-slate-500 block mb-1">Start</span>
              <input
                type="text"
                required={isPartial}
                value={form.partialStart}
                onChange={(e) => setForm({ ...form, partialStart: e.target.value })}
                placeholder="e.g. 10:00 AM"
                className="border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-navy)] w-full bg-white dark:bg-slate-700 dark:text-white dark:placeholder-slate-400"
              />
            </div>
            <div>
              <span className="text-xs text-slate-500 block mb-1">End</span>
              <input
                type="text"
                required={isPartial}
                value={form.partialEnd}
                onChange={(e) => setForm({ ...form, partialEnd: e.target.value })}
                placeholder="e.g. 2:00 PM"
                className="border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-navy)] w-full bg-white dark:bg-slate-700 dark:text-white dark:placeholder-slate-400"
              />
            </div>
          </div>
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
          className="border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white dark:placeholder-slate-400 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-navy)] w-full"
        />
      </div>

      {/* Notes */}
      <div>
        <label className="text-xs font-semibold uppercase tracking-widest text-slate-400 block mb-1.5">
          Notes <span className="text-slate-300 dark:text-slate-500 font-normal normal-case tracking-normal">optional</span>
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
