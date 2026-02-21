'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { format, addDays } from 'date-fns'
import { getWeekStartByIndex, getTotalWeeks } from '@/lib/scheduleWeeks'
import { Palmtree, RefreshCw, Thermometer, X, Trash2, Copy } from 'lucide-react'
import { ShiftCell } from './ShiftCell'
import { WeekNav } from './WeekNav'
import { HoursSummary } from './HoursSummary'
import { StatCard } from '@/components/ui/StatCard'
import { Avatar } from '@/components/ui/Avatar'
import { parseHours, SHIFT_TYPES } from '@/lib/shiftUtils'
import type { StoreConfig } from '@/lib/stores'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const
const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const

type GridData = Record<string, Record<number, string>>

interface ScheduleGridProps {
  store: StoreConfig
  canEdit: boolean
  employees: string[]
  initialData: GridData
  weekStartDate: Date
  initialWeekIdx: number
  totalWeeks: number
  currentUser: { role: string; name: string }
  initialWeeklyBudget?: number | null
  initialWeeklyLy?: number | null
  initialDailyBudget?: number[]
  initialDailyLy?: number[]
}

const SHIFT_LEGEND = [
  { key: 'PTO' as const, icon: Palmtree },
  { key: 'COMP' as const, icon: RefreshCw },
  { key: 'SICK' as const, icon: Thermometer },
  { key: 'OFF' as const, icon: X },
]

export function ScheduleGrid({
  store,
  canEdit,
  employees: initialEmployees,
  initialData,
  weekStartDate,
  initialWeekIdx,
  totalWeeks,
  currentUser,
  initialWeeklyBudget = null,
  initialWeeklyLy = null,
  initialDailyBudget,
  initialDailyLy,
}: ScheduleGridProps) {
  const [weekIdx, setWeekIdx] = useState(initialWeekIdx)
  const [gridData, setGridData] = useState<GridData>(initialData)
  const [loading, setLoading] = useState(false)
  const [dailyBudget, setDailyBudget] = useState<number[]>(initialDailyBudget ?? [0, 0, 0, 0, 0, 0, 0])
  const [dailyLy, setDailyLy] = useState<number[]>(initialDailyLy ?? [0, 0, 0, 0, 0, 0, 0])

  useEffect(() => {
    setWeekIdx(initialWeekIdx)
  }, [initialWeekIdx])
  useEffect(() => {
    setDailyBudget(initialDailyBudget ?? [0, 0, 0, 0, 0, 0, 0])
    setDailyLy(initialDailyLy ?? [0, 0, 0, 0, 0, 0, 0])
  }, [initialDailyBudget, initialDailyLy])
  const [emailState, setEmailState] = useState<'idle' | 'loading' | 'sent'>('idle')
  const [employees, setEmployees] = useState<string[]>(initialEmployees)

  // When store changes (e.g. sidebar selection), show that store's employees and data only
  useEffect(() => {
    setEmployees(initialEmployees)
    setGridData(initialData)
  }, [store.id])
  const [toast, setToast] = useState<string | null>(null)
  const [copySource, setCopySource] = useState<{ employeeName: string; dayOfWeek: number } | null>(null)
  const [copyMode, setCopyMode] = useState(false)
  const [deleteState, setDeleteState] = useState<'idle' | 'loading'>('idle')
  const [weeklyBudget, setWeeklyBudget] = useState<number | null>(initialWeeklyBudget ?? null)
  const [weeklyLy, setWeeklyLy] = useState<number | null>(initialWeeklyLy ?? null)
  const gridRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const weekStart = getWeekStartByIndex(weekIdx)
  const weekStartStr = format(weekStart, 'yyyy-MM-dd')

  const updateUrlWeek = useCallback(
    (newWeekIdx: number) => {
      const params = new URLSearchParams(searchParams.toString())
      params.set('week', String(newWeekIdx))
      router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    },
    [pathname, router, searchParams]
  )

  function formatCurrency(n: number | null): string {
    if (n == null || Number.isNaN(n)) return '—'
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
  }

  // Fetch data when store or week changes
  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      try {
        const res = await fetch(`/api/schedule?storeId=${store.id}&weekStart=${weekStartStr}`)
        if (res.ok) {
          const json = await res.json()
          const data = json.data ?? []
          const newGrid: GridData = {}
          for (const row of data) {
            if (!newGrid[row.employeeName]) newGrid[row.employeeName] = {}
            newGrid[row.employeeName][row.dayOfWeek] = row.shiftValue ?? ''
          }
          setGridData(newGrid)
          setWeeklyBudget(typeof json.weeklyBudget === 'number' ? json.weeklyBudget : null)
          setWeeklyLy(typeof json.weeklyLy === 'number' ? json.weeklyLy : null)
          if (Array.isArray(json.dailyBudget) && json.dailyBudget.length === 7)
            setDailyBudget(json.dailyBudget)
          if (Array.isArray(json.dailyLy) && json.dailyLy.length === 7)
            setDailyLy(json.dailyLy)
        }
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [store.id, weekStartStr])

  const handleCellChange = useCallback(
    async (employeeName: string, dayOfWeek: number, value: string) => {
      // Optimistic update
      setGridData((prev) => ({
        ...prev,
        [employeeName]: { ...(prev[employeeName] ?? {}), [dayOfWeek]: value },
      }))

      try {
        const res = await fetch('/api/schedule', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            storeId: store.id,
            employeeName,
            weekStart: weekStartStr,
            dayOfWeek,
            shiftValue: value,
          }),
        })
        if (!res.ok) throw new Error('Failed to save')
      } catch {
        // Revert on error
        setGridData((prev) => ({
          ...prev,
          [employeeName]: { ...(prev[employeeName] ?? {}), [dayOfWeek]: '' },
        }))
        setToast('Failed to save. Please try again.')
        setTimeout(() => setToast(null), 3000)
      }
    },
    [store.id, weekStartStr]
  )

  async function handleEmail() {
    if (!gridRef.current) return
    setEmailState('loading')
    try {
      const html2canvas = (await import('html2canvas')).default
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const canvas = await html2canvas(gridRef.current, { scale: 2, useCORS: true } as any)
      const imageBase64 = canvas.toDataURL('image/png')

      const res = await fetch('/api/schedule/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeId: store.id, weekStart: weekStartStr, imageBase64 }),
      })
      if (!res.ok) throw new Error('Failed to send')
      setEmailState('sent')
      setTimeout(() => setEmailState('idle'), 3000)
    } catch {
      setEmailState('idle')
      setToast('Failed to send email.')
      setTimeout(() => setToast(null), 3000)
    }
  }

  // Compute stats
  const allHours = employees.map((emp) => {
    const days = gridData[emp] ?? {}
    return Object.values(days).reduce((sum, v) => sum + parseHours(v), 0)
  })
  const totalHours = allHours.reduce((a, b) => a + b, 0)
  const staffCount = employees.filter((emp) => {
    const days = gridData[emp] ?? {}
    return Object.values(days).some((v) => v && v !== 'OFF')
  }).length
  const avgPerPerson = staffCount > 0 ? Math.round(totalHours / staffCount) : 0
  const daysCovered = DAYS.filter((_, i) =>
    employees.some((emp) => {
      const v = gridData[emp]?.[i]
      return v && v !== 'OFF' && v !== ''
    })
  ).length

  const storeHours = store.hours as Record<string, string>

  async function handleDeleteSchedule() {
    if (!confirm('Delete the entire schedule for this week? This cannot be undone.')) return
    setDeleteState('loading')
    try {
      const res = await fetch(`/api/schedule?storeId=${store.id}&weekStart=${weekStartStr}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      setGridData({})
      showToast('Schedule cleared.')
    } catch {
      setToast('Failed to delete schedule.')
      setTimeout(() => setToast(null), 3000)
    } finally {
      setDeleteState('idle')
    }
  }

  function handleCellClickForCopy(employeeName: string, dayOfWeek: number) {
    if (!copySource) {
      setCopySource({ employeeName, dayOfWeek })
      return
    }
    if (copySource.employeeName === employeeName && copySource.dayOfWeek === dayOfWeek) {
      setCopySource(null)
      return
    }
    const sourceVal = gridData[copySource.employeeName]?.[copySource.dayOfWeek] ?? ''
    handleCellChange(employeeName, dayOfWeek, sourceVal)
    setCopySource(null)
    setCopyMode(false)
    setToast('Cell copied.')
    setTimeout(() => setToast(null), 2000)
  }

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  return (
    <div className="p-4 flex flex-col min-h-[calc(100vh-3rem)]">
      {/* Week navigation - compact */}
      <WeekNav
        weekIdx={weekIdx}
        totalWeeks={totalWeeks}
        weekStart={weekStart}
        onPrev={() => {
          const next = Math.max(0, weekIdx - 1)
          setWeekIdx(next)
          updateUrlWeek(next)
        }}
        onNext={() => {
          const next = Math.min(totalWeeks - 1, weekIdx + 1)
          setWeekIdx(next)
          updateUrlWeek(next)
        }}
        canEmail={canEdit}
        emailState={emailState}
        onEmail={handleEmail}
      />

      {/* Weekly budget goals & LY */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 mb-3">
        <StatCard
          label="Weekly budget goal"
          value={formatCurrency(weeklyBudget)}
          accentColor={store.color}
        />
        <StatCard
          label="Weekly LY budget"
          value={formatCurrency(weeklyLy)}
          accentColor={store.color}
        />
        <StatCard
          label="Week Total Hours"
          value={`${totalHours}h`}
          accentColor={store.color}
        />
        <StatCard
          label="Staff on Rota"
          value={staffCount}
          accentColor={store.color}
        />
        <StatCard
          label="Avg Per Person"
          value={`${avgPerPerson}h`}
          accentColor={store.color}
        />
        <StatCard
          label="Days Covered"
          value={`${daysCovered} / 7`}
          accentColor={store.color}
        />
      </div>

      {/* Shift legend + schedule actions */}
      <div className="flex flex-wrap items-center gap-1.5 mb-3">
        {SHIFT_LEGEND.map(({ key, icon: Icon }) => {
          const type = SHIFT_TYPES[key]
          return (
            <span
              key={key}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${type.bg} ${type.text} ${type.border}`}
            >
              <Icon className="w-3 h-3" />
              {type.label}
              {type.hours > 0 && <span className="opacity-60 ml-0.5">{type.hours}h</span>}
            </span>
          )
        })}
        {canEdit && (
          <>
            <span className="mx-2 text-slate-300 dark:text-slate-500">|</span>
            <button
              type="button"
              onClick={handleDeleteSchedule}
              disabled={deleteState === 'loading'}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60 disabled:opacity-50"
            >
              <Trash2 className="w-3 h-3" />
              Delete week
            </button>
            <button
              type="button"
              onClick={() => { setCopyMode(true); setCopySource(null) }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${
                copyMode
                  ? 'border-[var(--brand-navy)] bg-[var(--brand-navy)]/10 dark:bg-blue-500/20 text-[var(--brand-navy)] dark:text-blue-200'
                  : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60'
              }`}
            >
              <Copy className="w-3 h-3" />
              Copy cell
              {copySource && <span className="opacity-80">→ click destination</span>}
            </button>
            {!copyMode && (
              <span className="ml-auto text-xs text-slate-400 dark:text-slate-500 hidden sm:inline">
                Click to type · Right-click for quick-set
              </span>
            )}
          </>
        )}
      </div>

      {/* Schedule grid - flex-1 so it takes remaining space */}
      <div
        id="schedule-grid"
        ref={gridRef}
        className="flex-1 min-h-0 bg-[var(--card)] dark:bg-slate-800/50 rounded-xl shadow-sm dark:shadow-none border border-[var(--border)] overflow-auto"
      >
        {loading ? (
          <div className="p-8 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-10 bg-slate-100 dark:bg-slate-700/60 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <table className="w-full min-w-[700px] border-collapse">
            <thead>
              <tr className="bg-[var(--brand-navy)] text-white border-b-0">
                <th className="text-left px-4 py-3 w-44 rounded-tl-lg">
                  <span className="text-xs font-semibold uppercase tracking-widest text-white/80">Employee</span>
                </th>
                {DAYS.map((day, i) => {
                  const dayDate = addDays(weekStart, i)
                  const dayKey = DAY_KEYS[i]
                  const storeHour = storeHours[dayKey] ?? '11AM–7PM'
                  return (
                    <th key={day} className="px-2 py-3 text-center">
                      <div className="text-xs font-semibold">{day}, {format(dayDate, 'MMM d')}</div>
                      <div className="text-xs text-white/70 font-normal">{storeHour}</div>
                    </th>
                  )
                })}
                <th className="px-4 py-3 text-center rounded-tr-lg">
                  <span className="text-xs font-semibold uppercase tracking-widest text-white/80">WTD</span>
                </th>
              </tr>
              <tr className="bg-slate-100 dark:bg-slate-700/80 border-b border-slate-200 dark:border-slate-600">
                <th className="text-left px-4 py-1.5 w-44 text-xs font-semibold text-slate-600 dark:text-slate-300">
                  Daily budget goal
                </th>
                {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                  <th key={i} className="px-2 py-1.5 text-center text-xs font-medium text-slate-700 dark:text-slate-200">
                    {formatCurrency(dailyBudget[i] ?? 0)}
                  </th>
                ))}
                <th className="px-4 py-1.5 text-center text-xs font-semibold text-slate-800 dark:text-slate-100">
                  {formatCurrency(weeklyBudget)}
                </th>
              </tr>
              <tr className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-600">
                <th className="text-left px-4 py-1.5 w-44 text-xs font-semibold text-slate-600 dark:text-slate-300">
                  Daily LY budget
                </th>
                {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                  <th key={i} className="px-2 py-1.5 text-center text-xs font-medium text-slate-700 dark:text-slate-200">
                    {formatCurrency(dailyLy[i] ?? 0)}
                  </th>
                ))}
                <th className="px-4 py-1.5 text-center text-xs font-semibold text-slate-800 dark:text-slate-100">
                  {formatCurrency(weeklyLy)}
                </th>
              </tr>
            </thead>
            <tbody>
              {employees.map((emp) => {
                const empData = gridData[emp] ?? {}
                const weekTotal = Object.values(empData).reduce(
                  (sum, v) => sum + parseHours(v),
                  0
                )
                const isOT = weekTotal > 40

                return (
                  <tr key={emp} className="border-b border-slate-50 dark:border-slate-700/80 hover:bg-slate-50/50 dark:hover:bg-slate-700/20 transition-colors">
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        <Avatar name={emp} size="sm" color={store.color} />
                        <span className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{emp}</span>
                      </div>
                    </td>
                    {[0, 1, 2, 3, 4, 5, 6].map((day) => {
                      const isCopySource = copySource?.employeeName === emp && copySource?.dayOfWeek === day
                      return (
                        <td
                          key={day}
                          className={`px-1.5 py-1.5 ${isCopySource ? 'ring-2 ring-[var(--brand-navy)] ring-offset-1 rounded-lg' : ''}`}
                          onClick={canEdit && copyMode ? () => handleCellClickForCopy(emp, day) : undefined}
                        >
                          <div className={canEdit && copyMode ? 'pointer-events-none' : ''}>
                            <ShiftCell
                              value={empData[day] ?? ''}
                              onChange={(val) => handleCellChange(emp, day, val)}
                              readOnly={!canEdit || copyMode}
                              storeColor={store.color}
                            />
                          </div>
                        </td>
                      )
                    })}
                    <td className="px-4 py-2 text-center">
                      <div
                        className="text-sm font-bold"
                        style={{ color: store.color }}
                      >
                        {weekTotal}h
                      </div>
                      {isOT && (
                        <div className="text-xs font-semibold text-red-600 dark:text-red-400">OT</div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <HoursSummary employees={employees} data={gridData} storeColor={store.color} />
            </tfoot>
          </table>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-4 right-4 z-50 bg-red-600 text-white px-4 py-3 rounded-xl shadow-lg text-sm font-medium">
          {toast}
        </div>
      )}
    </div>
  )
}
