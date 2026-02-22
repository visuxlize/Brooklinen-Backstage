'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { format, addDays } from 'date-fns'
import { getWeekStartByIndex, getTotalWeeks } from '@/lib/scheduleWeeks'
import { Palmtree, RefreshCw, Thermometer, X, Trash2, GripVertical } from 'lucide-react'
import { ShiftCell } from './ShiftCell'
import { WeekNav } from './WeekNav'
import { HoursSummary } from './HoursSummary'
import { StatCard } from '@/components/ui/StatCard'
import { Avatar } from '@/components/ui/Avatar'
import { parsePaidHours, SHIFT_TYPES, shiftFitsInWindow, formatTime24to12 } from '@/lib/shiftUtils'
import { STORE_CONFIG, type StoreConfig } from '@/lib/stores'

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
  initialBudgetHoursDaily?: number[]
  initialTrendingHoursDaily?: number[]
  initialPeakWindowByDay?: string[]
  initialAllowableHours?: number | null
  initialWeekMeta?: { workload: Record<string, string> | null; promotions: Record<string, string> | null; hoursOverride: Record<string, string> | null }
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
  initialBudgetHoursDaily,
  initialTrendingHoursDaily,
  initialPeakWindowByDay,
  initialAllowableHours = null,
  initialWeekMeta,
}: ScheduleGridProps) {
  const [weekIdx, setWeekIdx] = useState(initialWeekIdx)
  const [gridData, setGridData] = useState<GridData>(initialData)
  const [loading, setLoading] = useState(false)
  const [dailyBudget, setDailyBudget] = useState<number[]>(initialDailyBudget ?? [0, 0, 0, 0, 0, 0, 0])
  const [dailyLy, setDailyLy] = useState<number[]>(initialDailyLy ?? [0, 0, 0, 0, 0, 0, 0])
  const [budgetHoursDaily, setBudgetHoursDaily] = useState<number[]>(initialBudgetHoursDaily ?? [0, 0, 0, 0, 0, 0, 0])
  const [trendingHoursDaily, setTrendingHoursDaily] = useState<number[]>(initialTrendingHoursDaily ?? [0, 0, 0, 0, 0, 0, 0])
  const [peakWindowByDay, setPeakWindowByDay] = useState<string[]>(initialPeakWindowByDay ?? ['—', '—', '—', '—', '—', '—', '—'])
  const [allowableHours, setAllowableHours] = useState<number | null>(initialAllowableHours ?? null)
  const [workload, setWorkload] = useState<Record<string, string>>(initialWeekMeta?.workload ?? {})
  const [promotions, setPromotions] = useState<Record<string, string>>(initialWeekMeta?.promotions ?? {})
  const [hoursOverride, setHoursOverride] = useState<Record<string, string> | null>(initialWeekMeta?.hoursOverride ?? null)
  const [savingMeta, setSavingMeta] = useState(false)

  useEffect(() => {
    setWeekIdx(initialWeekIdx)
  }, [initialWeekIdx])
  useEffect(() => {
    setDailyBudget(initialDailyBudget ?? [0, 0, 0, 0, 0, 0, 0])
    setDailyLy(initialDailyLy ?? [0, 0, 0, 0, 0, 0, 0])
  }, [initialDailyBudget, initialDailyLy])
  const [emailState, setEmailState] = useState<'idle' | 'loading' | 'sent'>('idle')
  const [employees, setEmployees] = useState<string[]>(initialEmployees)

  // When store changes, reset to initial then fetch will repopulate with order + coverage
  useEffect(() => {
    if (store.id) {
      setEmployees(initialEmployees)
      setGridData(initialData)
    }
  }, [store.id])
  const [toast, setToast] = useState<string | null>(null)
  const [copySource, setCopySource] = useState<{ employeeName: string; dayOfWeek: number } | null>(null)
  const [coverageAway, setCoverageAway] = useState<{ employeeName: string; dayOfWeek: number; atStoreName: string }[]>([])
  const [coverageFromStoreByEmployee, setCoverageFromStoreByEmployee] = useState<Record<string, number>>({})
  const [refetchTrigger, setRefetchTrigger] = useState(0)
  const [addCoverageFromStoreId, setAddCoverageFromStoreId] = useState<number | null>(null)
  const [addCoverageEmployeeName, setAddCoverageEmployeeName] = useState('')
  const [addCoverageCells, setAddCoverageCells] = useState<Record<number, string>>({})
  const [deleteState, setDeleteState] = useState<'idle' | 'loading'>('idle')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [weeklyBudget, setWeeklyBudget] = useState<number | null>(initialWeeklyBudget ?? null)
  const [weeklyLy, setWeeklyLy] = useState<number | null>(initialWeeklyLy ?? null)
  const [weekAvailability, setWeekAvailability] = useState<Record<string, Record<number, { type: string; start?: string; end?: string }>> | null>(null)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
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
        const [scheduleRes, availabilityRes] = await Promise.all([
          fetch(`/api/schedule?storeId=${store.id}&weekStart=${weekStartStr}`),
          fetch(`/api/availability?storeId=${store.id}&weekStart=${weekStartStr}`),
        ])
        if (scheduleRes.ok) {
          const json = await scheduleRes.json()
          const data = json.data ?? []
          const newGrid: GridData = {}
          const coverageFrom: Record<string, number> = {}
          for (const row of data) {
            if (!newGrid[row.employeeName]) newGrid[row.employeeName] = {}
            newGrid[row.employeeName][row.dayOfWeek] = row.shiftValue ?? ''
            if (row.coveringFromStoreId != null) coverageFrom[row.employeeName] = row.coveringFromStoreId
          }
          setGridData(newGrid)
          setCoverageAway((json.coverageAway ?? []).map((r: { employeeName: string; dayOfWeek: number; atStoreName: string }) => ({ employeeName: r.employeeName, dayOfWeek: r.dayOfWeek, atStoreName: r.atStoreName })))
          setCoverageFromStoreByEmployee(coverageFrom)
          const order = (json.weekMeta?.employeeOrder as string[] | null) ?? null
          const mainOrdered = order && order.length
            ? [...order.filter((n: string) => initialEmployees.includes(n)), ...initialEmployees.filter((n) => !order.includes(n))]
            : [...initialEmployees]
          const coverageNames = [...new Set<string>(data.filter((r: { coveringFromStoreId?: number | null }) => r.coveringFromStoreId).map((r: { employeeName: string }) => r.employeeName))].filter((n) => !mainOrdered.includes(n))
          setEmployees([...mainOrdered, ...coverageNames])
          setWeeklyBudget(typeof json.weeklyBudget === 'number' ? json.weeklyBudget : null)
          setWeeklyLy(typeof json.weeklyLy === 'number' ? json.weeklyLy : null)
          if (Array.isArray(json.dailyBudget) && json.dailyBudget.length === 7)
            setDailyBudget(json.dailyBudget)
          if (Array.isArray(json.dailyLy) && json.dailyLy.length === 7)
            setDailyLy(json.dailyLy)
          if (Array.isArray(json.budgetHoursDaily) && json.budgetHoursDaily.length === 7)
            setBudgetHoursDaily(json.budgetHoursDaily)
          if (Array.isArray(json.trendingHoursDaily) && json.trendingHoursDaily.length === 7)
            setTrendingHoursDaily(json.trendingHoursDaily)
          if (Array.isArray(json.peakWindowByDay) && json.peakWindowByDay.length === 7)
            setPeakWindowByDay(json.peakWindowByDay)
          setAllowableHours(typeof json.allowableHours === 'number' ? json.allowableHours : null)
          if (json.weekMeta && typeof json.weekMeta === 'object') {
            setWorkload(typeof json.weekMeta.workload === 'object' && json.weekMeta.workload !== null ? json.weekMeta.workload : {})
            setPromotions(typeof json.weekMeta.promotions === 'object' && json.weekMeta.promotions !== null ? json.weekMeta.promotions : {})
            setHoursOverride(json.weekMeta.hoursOverride ?? null)
          }
        }
        if (availabilityRes.ok) {
          const av = await availabilityRes.json()
          setWeekAvailability(av.weekAvailability ?? null)
        } else {
          setWeekAvailability(null)
        }
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [store.id, weekStartStr, refetchTrigger])

  const handleCellChange = useCallback(
    async (employeeName: string, dayOfWeek: number, value: string) => {
      const avail = weekAvailability?.[employeeName]?.[dayOfWeek]
      if (avail?.type === 'na') return // cell is read-only, should not reach here
      if (avail?.type === 'partial' && avail.start != null && avail.end != null) {
        if (!shiftFitsInWindow(value, avail.start, avail.end)) {
          const windowStr = `${formatTime24to12(avail.start)} – ${formatTime24to12(avail.end)}`
          setToast(`Shift must fall within ${windowStr} (availability window).`)
          setTimeout(() => setToast(null), 4000)
          return
        }
      }

      // Optimistic update
      setGridData((prev) => ({
        ...prev,
        [employeeName]: { ...(prev[employeeName] ?? {}), [dayOfWeek]: value },
      }))

      const coveringFrom = coverageFromStoreByEmployee[employeeName]
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
            ...(coveringFrom != null && { coveringFromStoreId: coveringFrom }),
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
    [store.id, weekStartStr, weekAvailability, coverageFromStoreByEmployee]
  )

  function handleSavePdf() {
    setEmailState('loading')
    try {
      const weekEnd = addDays(weekStart, 6)
      const dateRange = `${format(weekStart, 'MMM d')} – ${format(weekEnd, 'MMM d')}, ${format(weekStart, 'yyyy')}`
      const dayHeaders = DAYS.map((day, i) => {
        const d = addDays(weekStart, i)
        return `<th style="padding:8px 6px;text-align:center;font-size:11px;border:1px solid #e2e8f0;">${day}<br/><span style="font-weight:400;color:#64748b;">${format(d, 'M/d')}</span></th>`
      }).join('')
      const budgetRow = [0, 1, 2, 3, 4, 5, 6].map((i) => `<td style="padding:6px;text-align:center;font-size:11px;border:1px solid #e2e8f0;">${formatCurrency(dailyBudget[i] ?? 0)}</td>`).join('')
      const employeeRows = employees.map((emp) => {
        const days = gridData[emp] ?? {}
        const wtd = Object.values(days).reduce((sum, v) => sum + (v === 'N/A' ? 0 : parsePaidHours(v)), 0)
        const cells = [0, 1, 2, 3, 4, 5, 6].map((day) => {
          const cellAvail = weekAvailability?.[emp]?.[day]
          const display = cellAvail?.type === 'na' ? 'N/A' : (days[day] ?? '—')
          return `<td style="padding:6px;text-align:center;font-size:11px;border:1px solid #e2e8f0;">${display}</td>`
        }).join('')
        return `<tr><td style="padding:6px 10px;font-size:11px;border:1px solid #e2e8f0;">${emp}</td>${cells}<td style="padding:6px;text-align:center;font-weight:600;font-size:11px;border:1px solid #e2e8f0;">${wtd}h</td></tr>`
      }).join('')
      const dayTotals = [0, 1, 2, 3, 4, 5, 6].map((day) =>
        employees.reduce((sum, emp) => sum + parsePaidHours((gridData[emp] ?? {})[day] === 'N/A' ? '' : (gridData[emp] ?? {})[day] ?? ''), 0)
      )
      const actualRow = dayTotals.map((h) => `<td style="padding:6px;text-align:center;font-weight:600;font-size:11px;border:1px solid #e2e8f0;">${h > 0 ? h + 'h' : '—'}</td>`).join('')
      const grandTotal = dayTotals.reduce((a, b) => a + b, 0)
      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Schedule ${dateRange}</title><style>
        body { font-family: system-ui, -apple-system, sans-serif; color: #0f172a; padding: 24px; margin: 0; }
        h1 { font-size: 18px; margin: 0 0 4px 0; }
        .meta { font-size: 12px; color: #64748b; margin-bottom: 16px; }
        table { border-collapse: collapse; width: 100%; max-width: 900px; }
        thead th { background: #1e3a5f; color: white; font-weight: 600; }
        .footer-row td { background: #1e3a5f; color: white; font-weight: 600; }
        @media print { body { padding: 12px; } }
      </style></head><body>
        <h1>${store.name}</h1>
        <p class="meta">${dateRange} · Week schedule</p>
        <table>
          <thead><tr><th style="padding:10px;text-align:left;width:140px;">Employee</th>${dayHeaders}<th style="padding:8px;text-align:center;width:56px;">WTD</th></tr>
          <tr><th style="padding:6px 10px;text-align:left;font-size:10px;color:#64748b;">Daily budget</th>${budgetRow}<th></th></tr></thead>
          <tbody>${employeeRows}</tbody>
          <tfoot><tr class="footer-row"><td style="padding:8px 10px;">Actual hours</td>${actualRow}<td style="padding:8px;text-align:center;">${grandTotal}h</td></tr></tfoot>
        </table>
      </body></html>`
      const w = window.open('', '_blank', 'noopener,noreferrer')
      if (w) {
        w.document.write(html)
        w.document.close()
        w.focus()
        setTimeout(() => {
          w.print()
          w.onafterprint = () => w.close()
        }, 300)
      }
      setEmailState('sent')
      setTimeout(() => setEmailState('idle'), 2000)
    } catch {
      setEmailState('idle')
      setToast('Failed to open print view.')
      setTimeout(() => setToast(null), 3000)
    }
  }

  // Compute stats (treat N/A as 0 hours, don't count N/A-only days toward staff)
  const allHours = employees.map((emp) => {
    const days = gridData[emp] ?? {}
    return Object.values(days).reduce((sum, v) => sum + (v === 'N/A' ? 0 : parsePaidHours(v)), 0)
  })
  const totalHours = allHours.reduce((a, b) => a + b, 0)
  const staffCount = employees.filter((emp) => {
    const days = gridData[emp] ?? {}
    return Object.values(days).some((v) => v && v !== 'OFF' && v !== 'N/A')
  }).length
  const avgPerPerson = staffCount > 0 ? Math.round(totalHours / staffCount) : 0

  const storeHours: Record<string, string> = hoursOverride && Object.keys(hoursOverride).length > 0
    ? { ...(store.hours as Record<string, string>), ...hoursOverride }
    : (store.hours as Record<string, string>)

  async function saveWeekMeta(patch: { workload?: Record<string, string>; promotions?: Record<string, string>; hoursOverride?: Record<string, string> | null }) {
    setSavingMeta(true)
    try {
      const res = await fetch('/api/schedule-meta', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeId: store.id,
          weekStart: weekStartStr,
          ...patch,
        }),
      })
      if (!res.ok) throw new Error('Failed to save')
      if (patch.workload !== undefined) setWorkload(patch.workload)
      if (patch.promotions !== undefined) setPromotions(patch.promotions)
      if (patch.hoursOverride !== undefined) setHoursOverride(patch.hoursOverride)
      setToast('Saved.')
      setTimeout(() => setToast(null), 2000)
    } catch {
      setToast('Failed to save.')
      setTimeout(() => setToast(null), 3000)
    } finally {
      setSavingMeta(false)
    }
  }

  async function handleDeleteSchedule() {
    setDeleteState('loading')
    try {
      const res = await fetch(`/api/schedule?storeId=${store.id}&weekStart=${weekStartStr}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      setGridData({})
      setShowDeleteConfirm(false)
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
    setToast('Cell copied.')
    setTimeout(() => setToast(null), 2000)
  }

  async function handleAddCoverageCellChange(day: number, value: string) {
    if (!addCoverageFromStoreId || !addCoverageEmployeeName.trim()) {
      setToast('Select "From store" and enter employee name first.')
      setTimeout(() => setToast(null), 3000)
      return
    }
    setAddCoverageCells((prev) => ({ ...prev, [day]: value }))
    try {
      const res = await fetch('/api/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeId: store.id,
          employeeName: addCoverageEmployeeName.trim(),
          weekStart: weekStartStr,
          dayOfWeek: day,
          shiftValue: value,
          coveringFromStoreId: addCoverageFromStoreId,
        }),
      })
      if (!res.ok) throw new Error('Failed to save')
      setRefetchTrigger((t) => t + 1)
    } catch {
      setToast('Failed to save. Please try again.')
      setTimeout(() => setToast(null), 3000)
    }
  }

  function handleCellContextMenu(e: React.MouseEvent, emp: string, day: number) {
    e.preventDefault()
    if (!canEdit) return
    if (!copySource) {
      setCopySource({ employeeName: emp, dayOfWeek: day })
      setToast('Right-click another cell to paste.')
      setTimeout(() => setToast(null), 2500)
      return
    }
    if (copySource.employeeName === emp && copySource.dayOfWeek === day) {
      setCopySource(null)
      setToast(null)
      return
    }
    handleCellClickForCopy(emp, day)
  }

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  async function reorderEmployees(fromIndex: number, toIndex: number) {
    if (fromIndex === toIndex) return
    const next = (() => {
      const arr = [...employees]
      const [removed] = arr.splice(fromIndex, 1)
      arr.splice(toIndex, 0, removed)
      return arr
    })()
    setEmployees(next)
    try {
      const res = await fetch('/api/schedule-meta', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeId: store.id,
          weekStart: weekStartStr,
          employeeOrder: next,
        }),
      })
      if (!res.ok) throw new Error('Failed to save order')
    } catch {
      setToast('Failed to save order.')
      setTimeout(() => setToast(null), 3000)
    }
  }

  function handleDragStart(e: React.DragEvent, index: number) {
    setDraggedIndex(index)
    e.dataTransfer.setData('text/plain', String(index))
    e.dataTransfer.effectAllowed = 'move'
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverIndex(index)
  }

  function handleDragLeave() {
    setDragOverIndex(null)
  }

  function handleDrop(e: React.DragEvent, toIndex: number) {
    e.preventDefault()
    const fromIndex = parseInt(e.dataTransfer.getData('text/plain'), 10)
    if (Number.isNaN(fromIndex) || fromIndex === toIndex) return
    reorderEmployees(fromIndex, toIndex)
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  function handleDragEnd() {
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  return (
    <div className="p-3 sm:p-4 flex flex-col min-h-[calc(100vh-3rem)] max-w-full relative">
      {/* Delete schedule confirmation card */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setShowDeleteConfirm(false)}>
          <div
            className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-600 p-6 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-base font-medium text-slate-900 dark:text-slate-100 mb-1">
              Delete entire schedule?
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
              This will clear the schedule for this week for {store.name}. This cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-600 transition-colors"
              >
                No
              </button>
              <button
                type="button"
                onClick={handleDeleteSchedule}
                disabled={deleteState === 'loading'}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-xl disabled:opacity-50 transition-colors"
              >
                {deleteState === 'loading' ? 'Deleting…' : 'Yes, delete'}
              </button>
            </div>
          </div>
        </div>
      )}

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
        onEmail={handleSavePdf}
      />

      {/* Weekly budget goals & LY — responsive cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3 mb-3">
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
              onClick={() => setShowDeleteConfirm(true)}
              disabled={deleteState === 'loading'}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60 disabled:opacity-50"
            >
              <Trash2 className="w-3 h-3" />
              Delete week
            </button>
            {copySource ? (
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Copy from selected · Right-click destination to paste
              </span>
            ) : (
              <span className="text-xs text-slate-400 dark:text-slate-500 hidden sm:inline">
                Right-click cell to copy · Right-click another to paste
              </span>
            )}
          </>
        )}
      </div>

      {/* Edit hours for this week (override) - only when canEdit */}
      {canEdit && (
        <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
          <span className="text-slate-500 dark:text-slate-400">Store hours this week:</span>
          {(['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const).map((day) => (
            <span key={day} className="flex items-center gap-1">
              <span className="text-slate-400 dark:text-slate-500 capitalize w-8">{day}</span>
              <input
                type="text"
                value={hoursOverride?.[day] ?? storeHours[day] ?? ''}
                onChange={(e) => {
                  const v = e.target.value
                  const base = (store.hours as Record<string, string>) ?? {}
                  setHoursOverride((prev) => ({ ...base, ...(prev ?? {}), [day]: v }))
                }}
                onBlur={() => {
                  const next = hoursOverride && Object.keys(hoursOverride).length > 0 ? hoursOverride : null
                  saveWeekMeta({ hoursOverride: next })
                }}
                placeholder={(store.hours as Record<string, string>)?.[day] ?? '—'}
                className="w-24 px-2 py-1 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs"
              />
            </span>
          ))}
          {(hoursOverride && Object.keys(hoursOverride).length > 0) && (
            <button
              type="button"
              onClick={() => { setHoursOverride(null); saveWeekMeta({ hoursOverride: null }) }}
              className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 underline"
            >
              Reset to default
            </button>
          )}
        </div>
      )}

      {/* Schedule grid - scroll horizontally on small screens */}
      <div
        id="schedule-grid"
        ref={gridRef}
        className="flex-1 min-h-0 bg-[var(--card)] dark:bg-slate-800/50 rounded-xl shadow-sm dark:shadow-none border border-slate-200 dark:border-slate-600 overflow-x-auto overflow-y-auto -mx-1 px-1 sm:mx-0 sm:px-0"
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
                <th className="text-left px-4 py-3 w-52 rounded-tl-lg">
                  <span className="text-xs font-semibold uppercase tracking-widest text-white/80">Employee</span>
                </th>
                <th className="px-3 py-3 text-center w-14">
                  <span className="text-xs font-semibold uppercase tracking-widest text-white/80">WTD</span>
                </th>
                {DAYS.map((day, i) => {
                  const dayDate = addDays(weekStart, i)
                  const dayKey = DAY_KEYS[i]
                  const storeHour = storeHours[dayKey] ?? '11AM–7PM'
                  return (
                    <th key={day} className={`px-2 py-3 text-center ${i === DAYS.length - 1 ? 'rounded-tr-lg' : ''}`}>
                      <div className="text-xs font-semibold">{day}, {format(dayDate, 'MMM d')}</div>
                      <div className="text-xs text-white/70 font-normal">{storeHour}</div>
                    </th>
                  )
                })}
              </tr>
              <tr className="bg-slate-100 dark:bg-slate-700/80 border-b border-slate-200 dark:border-slate-600">
                <th className="text-left px-4 py-1.5 w-52 text-xs font-semibold text-slate-600 dark:text-slate-300">
                  Daily budget goal
                </th>
                <th className="px-2 py-1.5 text-center text-xs font-semibold text-slate-800 dark:text-slate-100 w-14">
                  {formatCurrency(weeklyBudget)}
                </th>
                {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                  <th key={i} className="px-2 py-1.5 text-center text-xs font-medium text-slate-700 dark:text-slate-200">
                    {formatCurrency(dailyBudget[i] ?? 0)}
                  </th>
                ))}
              </tr>
              <tr className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-600">
                <th className="text-left px-4 py-1.5 w-52 text-xs font-semibold text-slate-600 dark:text-slate-300">
                  Daily LY budget
                </th>
                <th className="px-2 py-1.5 text-center text-xs font-semibold text-slate-800 dark:text-slate-100 w-14">
                  {formatCurrency(weeklyLy)}
                </th>
                {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                  <th key={i} className="px-2 py-1.5 text-center text-xs font-medium text-slate-700 dark:text-slate-200">
                    {formatCurrency(dailyLy[i] ?? 0)}
                  </th>
                ))}
              </tr>
              <tr className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-600">
                <td className="px-4 py-2 w-52 text-xs font-semibold text-slate-600 dark:text-slate-300 align-middle">
                  Promotions
                </td>
                <td className="px-2 py-1.5 w-14 border-l border-slate-100 dark:border-slate-600/80" />
                {DAY_KEYS.map((dayKey) => (
                  <td key={dayKey} className="px-2 py-1.5 align-middle border-l border-slate-100 dark:border-slate-600/80">
                    {canEdit ? (
                      <input
                        type="text"
                        value={promotions[dayKey] ?? ''}
                        onChange={(e) => setPromotions((prev) => ({ ...prev, [dayKey]: e.target.value }))}
                        onBlur={() => saveWeekMeta({ promotions })}
                        placeholder="—"
                        className="w-full min-w-0 px-2 py-1.5 text-sm text-center border border-transparent rounded bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 placeholder-slate-400 hover:border-slate-200 dark:hover:border-slate-600 focus:border-[var(--brand-navy)] focus:outline-none"
                      />
                    ) : (
                      <span className="text-sm text-slate-700 dark:text-slate-300 block text-center">{promotions[dayKey]?.trim() || '—'}</span>
                    )}
                  </td>
                ))}
              </tr>
              <tr className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-600">
                <td className="px-4 py-2 w-52 text-xs font-semibold text-slate-600 dark:text-slate-300 align-middle">
                  Workload
                </td>
                <td className="px-2 py-1.5 w-14 border-l border-slate-100 dark:border-slate-600/80" />
                {DAY_KEYS.map((dayKey) => (
                  <td key={dayKey} className="px-2 py-1.5 align-middle border-l border-slate-100 dark:border-slate-600/80">
                    {canEdit ? (
                      <input
                        type="text"
                        value={workload[dayKey] ?? ''}
                        onChange={(e) => setWorkload((prev) => ({ ...prev, [dayKey]: e.target.value }))}
                        onBlur={() => saveWeekMeta({ workload })}
                        placeholder="—"
                        className="w-full min-w-0 px-2 py-1.5 text-sm text-center border border-transparent rounded bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 placeholder-slate-400 hover:border-slate-200 dark:hover:border-slate-600 focus:border-[var(--brand-navy)] focus:outline-none"
                      />
                    ) : (
                      <span className="text-sm text-slate-700 dark:text-slate-300 block text-center">{workload[dayKey]?.trim() || '—'}</span>
                    )}
                  </td>
                ))}
              </tr>
            </thead>
            <tbody>
              {employees.map((emp, index) => {
                const empData = gridData[emp] ?? {}
                const weekTotal = Object.values(empData).reduce(
                  (sum, v) => sum + parsePaidHours(v),
                  0
                )
                const isOT = weekTotal > 40
                const isDragging = draggedIndex === index
                const isDropTarget = dragOverIndex === index

                return (
                  <tr
                    key={emp}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, index)}
                    className={`border-b border-slate-50 dark:border-slate-700/80 transition-colors ${
                      isDragging ? 'opacity-50 bg-slate-100 dark:bg-slate-700/50' : 'hover:bg-slate-50/50 dark:hover:bg-slate-700/20'
                    } ${isDropTarget ? 'ring-1 ring-inset ring-[var(--brand-navy)] bg-blue-50/50 dark:bg-blue-900/20' : ''}`}
                  >
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        <div
                          draggable
                          onDragStart={(e) => handleDragStart(e, index)}
                          onDragEnd={handleDragEnd}
                          className="shrink-0 p-1 rounded cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600 touch-none"
                          title="Drag to reorder"
                        >
                          <GripVertical className="w-4 h-4" />
                        </div>
                        <Avatar name={emp} size="sm" color={store.color} />
                        <span className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{emp}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-center">
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
                    {[0, 1, 2, 3, 4, 5, 6].map((day) => {
                      const isCopySource = copySource?.employeeName === emp && copySource?.dayOfWeek === day
                      const cellAvail = weekAvailability?.[emp]?.[day]
                      const coverageAwayHere = coverageAway.find((c) => c.employeeName === emp && c.dayOfWeek === day)
                      const cellValue = coverageAwayHere ? coverageAwayHere.atStoreName : (empData[day] ?? '')
                      const isOffOrPto = !coverageAwayHere && (empData[day] === 'OFF' || empData[day] === 'PTO')
                      const isNa = cellAvail?.type === 'na' && !isOffOrPto
                      const hasPartialConflict =
                        cellAvail?.type === 'partial' &&
                        cellAvail.start != null &&
                        cellAvail.end != null &&
                        !shiftFitsInWindow(cellValue, cellAvail.start, cellAvail.end)
                      const readOnly = !canEdit || isNa || isOffOrPto
                      const window12h =
                        cellAvail?.start != null && cellAvail?.end != null
                          ? `${formatTime24to12(cellAvail.start)} – ${formatTime24to12(cellAvail.end)}`
                          : ''
                      const cellTitle =
                        hasPartialConflict
                          ? `Outside availability — must be within ${window12h}`
                          : cellAvail?.type === 'partial' && window12h
                            ? `Available ${window12h}`
                            : isOffOrPto
                              ? cellValue === 'PTO' ? 'PTO — paid time off' : 'OFF — requested time off'
                              : isNa
                                ? 'Not available'
                                : undefined
                      return (
                        <td
                          key={day}
                          className={`px-1.5 py-1.5 ${isCopySource ? 'ring-2 ring-[var(--brand-navy)] ring-offset-1 rounded-lg' : ''} ${(isNa || isOffOrPto) ? 'opacity-90' : ''} ${hasPartialConflict ? 'ring-2 ring-red-500 ring-offset-1 rounded-lg bg-red-50/80 dark:bg-red-900/20' : ''} ${coverageAwayHere ? 'bg-amber-50/80 dark:bg-amber-900/20' : ''}`}
                          onClick={canEdit && copySource && (copySource.employeeName !== emp || copySource.dayOfWeek !== day) ? () => handleCellClickForCopy(emp, day) : undefined}
                          onContextMenu={(e) => handleCellContextMenu(e, emp, day)}
                          title={cellTitle ?? (coverageAwayHere ? `Covering at ${coverageAwayHere.atStoreName}` : undefined)}
                        >
                          <div className={coverageAwayHere ? 'pointer-events-none' : canEdit && copySource ? 'pointer-events-none' : ''}>
                            <ShiftCell
                              value={cellValue}
                              onChange={(val) => handleCellChange(emp, day, val)}
                              readOnly={readOnly || !!coverageAwayHere}
                              storeColor={store.color}
                            />
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
              {canEdit && (
                <tr className="border-b border-slate-100 dark:border-slate-700 bg-amber-50/50 dark:bg-amber-900/10">
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Coverage</span>
                      <select
                        value={addCoverageFromStoreId ?? ''}
                        onChange={(e) => setAddCoverageFromStoreId(e.target.value ? parseInt(e.target.value, 10) : null)}
                        className="text-xs border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1.5 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                      >
                        <option value="">From store…</option>
                        {STORE_CONFIG.filter((s) => s.id !== store.id).map((s) => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                      <input
                        type="text"
                        value={addCoverageEmployeeName}
                        onChange={(e) => setAddCoverageEmployeeName(e.target.value)}
                        placeholder="Employee name"
                        className="text-xs border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1.5 w-32 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 placeholder-slate-400"
                      />
                    </div>
                  </td>
                  <td className="px-3 py-2 text-center text-slate-400 dark:text-slate-500 text-sm">—</td>
                  {[0, 1, 2, 3, 4, 5, 6].map((day) => (
                    <td key={day} className="px-1.5 py-1.5">
                      <ShiftCell
                        value={addCoverageCells[day] ?? ''}
                        onChange={(val) => handleAddCoverageCellChange(day, val)}
                        readOnly={!addCoverageFromStoreId || !addCoverageEmployeeName.trim()}
                        storeColor={store.color}
                      />
                    </td>
                  ))}
                </tr>
              )}
            </tbody>
            <tfoot>
              <HoursSummary
                employees={employees}
                data={gridData}
                storeColor={store.color}
                budgetHoursDaily={budgetHoursDaily}
                trendingHoursDaily={trendingHoursDaily}
                peakWindowByDay={peakWindowByDay}
                allowableHours={allowableHours}
              />
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
