'use client'

import { useState, useEffect } from 'react'
import { format, addDays } from 'date-fns'
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { getWeekStartByIndex, getWeekIndexForDate, getTotalWeeks } from '@/lib/scheduleWeeks'
import type { StoreConfig } from '@/lib/stores'

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

type DayType = 'open' | 'na' | 'partial'

interface DaySlot {
  type: DayType
  start?: string
  end?: string
}

interface StoreUser {
  id: string
  name: string
  storeId: number | null
}

interface AvailabilityRow {
  id: string
  userId: string
  effectiveDate: string
  scope: string
  daySchedule: Record<string, DaySlot> | null
}

function defaultPattern(): Record<string, DaySlot> {
  return Object.fromEntries(
    [0, 1, 2, 3, 4, 5, 6].map((d) => [String(d), { type: 'open' as DayType }])
  )
}

interface AvailabilityDashboardProps {
  store: StoreConfig
}

export function AvailabilityDashboard({ store }: AvailabilityDashboardProps) {
  const [employees, setEmployees] = useState<StoreUser[]>([])
  const [rows, setRows] = useState<AvailabilityRow[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedUserId, setSelectedUserId] = useState<string>('')
  const [effectiveFrom, setEffectiveFrom] = useState<string>(() => format(new Date(), 'yyyy-MM-dd'))
  const [pattern, setPattern] = useState<Record<string, DaySlot>>(defaultPattern())
  const [weekOnly, setWeekOnly] = useState(false)
  const [weekIdx, setWeekIdx] = useState(() => getWeekIndexForDate(new Date()))
  const [saveState, setSaveState] = useState<'idle' | 'saving'>('idle')
  const [toast, setToast] = useState<string | null>(null)

  const totalWeeks = getTotalWeeks()
  const weekStart = getWeekStartByIndex(weekIdx)
  const weekStartStr = format(weekStart, 'yyyy-MM-dd')
  const weekEnd = addDays(weekStart, 6)

  async function load() {
    setLoading(true)
    try {
      const [usersRes, availRes] = await Promise.all([
        fetch(`/api/admin/users?storeId=${store.id}`),
        fetch(`/api/availability?storeId=${store.id}`),
      ])
      if (usersRes.ok) {
        const { data: userData } = await usersRes.json()
        const list = (userData as StoreUser[]).filter((u) => u.storeId === store.id)
        setEmployees(list)
        if (!selectedUserId && list.length > 0) setSelectedUserId(list[0].id)
      }
      if (availRes.ok) {
        const { data: availData } = await availRes.json()
        setRows(availData)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [store.id])

  // Load latest ongoing availability for selected employee
  useEffect(() => {
    if (!selectedUserId) {
      setPattern(defaultPattern())
      setEffectiveFrom(format(new Date(), 'yyyy-MM-dd'))
      return
    }
    const ongoing = (rows as AvailabilityRow[])
      .filter((r) => r.userId === selectedUserId && (r.scope === 'ongoing' || !r.scope))
      .sort((a, b) => String(b.effectiveDate).localeCompare(String(a.effectiveDate)))[0]
    if (ongoing?.daySchedule && typeof ongoing.daySchedule === 'object') {
      setPattern({ ...defaultPattern(), ...ongoing.daySchedule })
      setEffectiveFrom(String(ongoing.effectiveDate))
    } else {
      setPattern(defaultPattern())
      setEffectiveFrom(format(new Date(), 'yyyy-MM-dd'))
    }
  }, [selectedUserId, rows])

  function setDay(day: number, slot: DaySlot) {
    setPattern((prev) => ({ ...prev, [String(day)]: slot }))
  }

  async function handleSave() {
    if (!selectedUserId) {
      setToast('Select an employee')
      return
    }
    const effectiveDate = weekOnly ? weekStartStr : effectiveFrom
    const scope = weekOnly ? 'week' : 'ongoing'

    setSaveState('saving')
    try {
      const res = await fetch('/api/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeId: store.id,
          userId: selectedUserId,
          effectiveDate,
          scope,
          daySchedule: pattern,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setToast(data.error ?? 'Failed to save')
        return
      }
      await load()
      setToast(weekOnly ? 'Week override saved.' : 'Availability saved. It’s effective from the date you set and stays until you change it.')
      setTimeout(() => setToast(null), 3000)
    } finally {
      setSaveState('idle')
    }
  }

  const selectedEmployee = employees.find((e) => e.id === selectedUserId)

  return (
    <div className="p-4 max-w-5xl">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Availability</h1>
        {toast && (
          <div className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-sm">
            {toast}
          </div>
        )}
      </div>

      <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
        Set each weekday to <strong>Open</strong> (available any time), <strong>N/A</strong> (not available), or <strong>Partial</strong> (specific times only). Saving makes it effective from the date you choose and keeps it until you change it again. Use “Only this week” for a one-off override.
      </p>

      {loading ? (
        <p className="text-slate-500">Loading…</p>
      ) : (
        <div className="space-y-6">
          {/* Employee + Effective from + Week-only option */}
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1.5">
                Employee
              </label>
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-700 dark:text-slate-100 min-w-[180px] focus:outline-none focus:ring-2 focus:ring-[var(--brand-navy)]"
              >
                <option value="">Select…</option>
                {employees.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>
            {!weekOnly && (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1.5">
                  Effective from
                </label>
                <input
                  type="date"
                  value={effectiveFrom}
                  onChange={(e) => setEffectiveFrom(e.target.value)}
                  className="border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[var(--brand-navy)]"
                />
              </div>
            )}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={weekOnly}
                onChange={(e) => setWeekOnly(e.target.checked)}
                className="rounded border-slate-300 dark:border-slate-600 text-[var(--brand-navy)] focus:ring-[var(--brand-navy)]"
              />
              <span className="text-sm text-slate-700 dark:text-slate-300">Only apply to a specific week</span>
            </label>
            {weekOnly && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setWeekIdx((i) => Math.max(0, i - 1))}
                  disabled={weekIdx <= 0}
                  className="p-2 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40"
                  aria-label="Previous week"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-2 px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-800/50 min-w-[200px] justify-center">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                    {format(weekStart, 'MMM d')} – {format(weekEnd, 'MMM d, yyyy')}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setWeekIdx((i) => Math.min(totalWeeks - 1, i + 1))}
                  disabled={weekIdx >= totalWeeks - 1}
                  className="p-2 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40"
                  aria-label="Next week"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            )}
            <Button
              onClick={handleSave}
              disabled={!selectedUserId || saveState === 'saving'}
            >
              {saveState === 'saving' ? 'Saving…' : weekOnly ? 'Save for this week only' : 'Save'}
            </Button>
          </div>

          {/* Repeating pattern: Sun–Sat (no dates when ongoing) */}
          <div className="bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-600 overflow-hidden">
            <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-600">
              {[0, 1, 2, 3, 4, 5, 6].map((day) => (
                <div
                  key={day}
                  className="p-3 text-center border-r border-slate-100 dark:border-slate-700 last:border-r-0 bg-slate-50 dark:bg-slate-700/50"
                >
                  <div className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                    {DAY_LABELS[day]}
                  </div>
                  {weekOnly && (
                    <div className="text-sm font-medium text-slate-800 dark:text-slate-200 mt-0.5">
                      {format(addDays(weekStart, day), 'M/d')}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 divide-x divide-slate-200 dark:divide-slate-600 min-h-[200px]">
              {[0, 1, 2, 3, 4, 5, 6].map((day) => {
                const slot = pattern[String(day)] ?? { type: 'open' }
                return (
                  <DayCell
                    key={day}
                    slot={slot}
                    onChange={(newSlot) => setDay(day, newSlot)}
                    disabled={!selectedUserId}
                  />
                )
              })}
            </div>
          </div>

          {selectedEmployee && (
            <p className="text-xs text-slate-400 dark:text-slate-500">
              {weekOnly
                ? `One-time override for ${selectedEmployee.name} the week of ${weekStartStr}.`
                : `Ongoing availability for ${selectedEmployee.name} effective ${effectiveFrom}. N/A days block scheduling; partial days only allow shifts within the times you set.`}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

function DayCell({
  slot,
  onChange,
  disabled,
}: {
  slot: DaySlot
  onChange: (s: DaySlot) => void
  disabled: boolean
}) {
  const [type, setType] = useState<DayType>(slot.type)
  const [start, setStart] = useState(slot.start ?? '09:00')
  const [end, setEnd] = useState(slot.end ?? '17:00')

  useEffect(() => {
    setType(slot.type)
    setStart(slot.start ?? '09:00')
    setEnd(slot.end ?? '17:00')
  }, [slot.type, slot.start, slot.end])

  function handleTypeChange(t: DayType) {
    setType(t)
    if (t === 'partial') {
      onChange({ type: 'partial', start, end })
    } else {
      onChange({ type: t })
    }
  }

  function handlePartialChange(newStart: string, newEnd: string) {
    setStart(newStart)
    setEnd(newEnd)
    onChange({ type: 'partial', start: newStart, end: newEnd })
  }

  return (
    <div className="p-3 flex flex-col gap-2 bg-white dark:bg-slate-800/30">
      <div className="flex flex-col gap-1">
        {(['open', 'na', 'partial'] as const).map((t) => (
          <button
            key={t}
            type="button"
            disabled={disabled}
            onClick={() => handleTypeChange(t)}
            className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              type === t
                ? t === 'open'
                  ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200 ring-1 ring-green-300 dark:ring-green-700'
                  : t === 'na'
                    ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200 ring-1 ring-red-300 dark:ring-red-700'
                    : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200 ring-1 ring-amber-300 dark:ring-amber-700'
                : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
            }`}
          >
            {t === 'open' ? 'Open' : t === 'na' ? 'N/A' : 'Partial'}
          </button>
        ))}
      </div>
      {type === 'partial' && (
        <div className="pt-2 mt-1 border-t border-slate-200 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700/50 p-2 space-y-2">
          <div>
            <label className="block text-[10px] font-medium text-slate-500 dark:text-slate-400 mb-0.5">Start</label>
            <input
              type="time"
              value={start}
              onChange={(e) => handlePartialChange(e.target.value, end)}
              disabled={disabled}
              className="w-full rounded border border-slate-200 dark:border-slate-600 px-2 py-1.5 text-xs bg-white dark:bg-slate-700 dark:text-slate-100"
            />
          </div>
          <div>
            <label className="block text-[10px] font-medium text-slate-500 dark:text-slate-400 mb-0.5">End</label>
            <input
              type="time"
              value={end}
              onChange={(e) => handlePartialChange(start, e.target.value)}
              disabled={disabled}
              className="w-full rounded border border-slate-200 dark:border-slate-600 px-2 py-1.5 text-xs bg-white dark:bg-slate-700 dark:text-slate-100"
            />
          </div>
        </div>
      )}
    </div>
  )
}
