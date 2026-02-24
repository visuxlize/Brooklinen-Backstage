'use client'

import { useState, useEffect } from 'react'
import { format, parseISO } from 'date-fns'
import { Megaphone } from 'lucide-react'

interface Promotion {
  id: string
  name: string
  startDate: string
  endDate: string
  description: string | null
}

export function PromotionsSettingsCard() {
  const [list, setList] = useState<Promotion[]>([])
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function fetchList() {
    try {
      const res = await fetch('/api/promotions')
      if (res.ok) {
        const data = await res.json()
        setList(Array.isArray(data) ? data : [])
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchList()
  }, [])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!name.trim() || !startDate || !endDate) {
      setError('Name, start date, and end date are required.')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/promotions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          startDate,
          endDate,
          description: description.trim() || undefined,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? 'Failed to add promotion.')
        return
      }
      setName('')
      setStartDate('')
      setEndDate('')
      setDescription('')
      await fetchList()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white dark:bg-slate-800/50 border border-[#e9ecf0] dark:border-slate-600 rounded-[14px] p-7">
      <h2 className="text-base font-bold text-[#0e1f3d] dark:text-slate-100 m-0 mb-5 pb-3.5 border-b border-[#f0f2f5] dark:border-slate-600 flex items-center gap-2">
        <Megaphone className="w-5 h-5 text-slate-500" />
        Promotions
      </h2>
      <p className="text-[0.875rem] text-[#6b7280] dark:text-slate-400 mb-5">
        Add upcoming promotions. They will appear on the dashboard for all users.
      </p>

      <form onSubmit={handleAdd} className="flex flex-col gap-3.5 mb-6">
        <div>
          <label className="block text-[0.72rem] font-bold tracking-[0.08em] text-[#8a94a6] dark:text-slate-400 uppercase mb-1.5">
            Promotion name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Super Plush 2.0"
            className="w-full h-[42px] border-[1.5px] border-[#e2e6eb] dark:border-slate-600 rounded-[10px] px-3.5 text-[0.95rem] bg-white dark:bg-slate-800 text-[#1a2332] dark:text-slate-200 outline-none focus:border-[#2563eb]"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[0.72rem] font-bold tracking-[0.08em] text-[#8a94a6] dark:text-slate-400 uppercase mb-1.5">
              Start date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full h-[42px] border-[1.5px] border-[#e2e6eb] dark:border-slate-600 rounded-[10px] px-3.5 text-[0.95rem] bg-white dark:bg-slate-800 text-[#1a2332] dark:text-slate-200 outline-none focus:border-[#2563eb]"
            />
          </div>
          <div>
            <label className="block text-[0.72rem] font-bold tracking-[0.08em] text-[#8a94a6] dark:text-slate-400 uppercase mb-1.5">
              End date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full h-[42px] border-[1.5px] border-[#e2e6eb] dark:border-slate-600 rounded-[10px] px-3.5 text-[0.95rem] bg-white dark:bg-slate-800 text-[#1a2332] dark:text-slate-200 outline-none focus:border-[#2563eb]"
            />
          </div>
        </div>
        <div>
          <label className="block text-[0.72rem] font-bold tracking-[0.08em] text-[#8a94a6] dark:text-slate-400 uppercase mb-1.5">
            Description (optional)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Short description"
            rows={2}
            className="w-full border-[1.5px] border-[#e2e6eb] dark:border-slate-600 rounded-[10px] px-3.5 py-2 text-[0.95rem] bg-white dark:bg-slate-800 text-[#1a2332] dark:text-slate-200 outline-none focus:border-[#2563eb] resize-none"
          />
        </div>
        {error && (
          <p className="text-[#e53935] dark:text-red-400 text-[0.82rem] m-0">{error}</p>
        )}
        <button
          type="submit"
          disabled={saving}
          className="self-start h-[42px] px-5 rounded-[10px] text-[0.875rem] font-semibold text-white bg-[#0e1f3d] dark:bg-slate-700 border-0 cursor-pointer hover:bg-[#1a3560] dark:hover:bg-slate-600 disabled:opacity-60"
        >
          {saving ? 'Adding…' : 'Add promotion'}
        </button>
      </form>

      <h3 className="text-sm font-semibold text-[#0e1f3d] dark:text-slate-100 mb-3">Upcoming</h3>
      {loading ? (
        <p className="text-[0.875rem] text-[#6b7280] dark:text-slate-400">Loading…</p>
      ) : list.length === 0 ? (
        <p className="text-[0.875rem] text-[#6b7280] dark:text-slate-400">No upcoming promotions.</p>
      ) : (
        <ul className="space-y-2">
          {list.map((p) => (
            <li
              key={p.id}
              className="text-[0.875rem] text-[#374151] dark:text-slate-200 border-b border-[#f0f2f5] dark:border-slate-600 pb-2 last:border-0"
            >
              <span className="font-medium">{p.name}</span>
              {' · '}
              {format(parseISO(p.startDate), 'MMM d')} – {format(parseISO(p.endDate), 'MMM d, yyyy')}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
