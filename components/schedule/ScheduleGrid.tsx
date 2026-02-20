'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { startOfWeek, addWeeks, format, addDays, getWeek } from 'date-fns'
import { Palmtree, RefreshCw, Thermometer, X } from 'lucide-react'
import { ShiftCell } from './ShiftCell'
import { WeekNav } from './WeekNav'
import { HoursSummary } from './HoursSummary'
import { StatCard } from '@/components/ui/StatCard'
import { Avatar } from '@/components/ui/Avatar'
import { parseHours, SHIFT_TYPES } from '@/lib/shiftUtils'
import type { StoreConfig } from '@/lib/stores'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const
const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const
const TOTAL_WEEKS = 5

type GridData = Record<string, Record<number, string>>

interface ScheduleGridProps {
  store: StoreConfig
  canEdit: boolean
  employees: string[]
  initialData: GridData
  weekStartDate: Date
  currentUser: { role: string; name: string }
}

const SHIFT_LEGEND = [
  { key: 'PTO' as const, icon: Palmtree },
  { key: 'COMP' as const, icon: RefreshCw },
  { key: 'SICK' as const, icon: Thermometer },
  { key: 'OFF' as const, icon: X },
]

function getWeekStart(weekIdx: number): Date {
  const base = startOfWeek(new Date(), { weekStartsOn: 0 })
  const monthStart = startOfWeek(new Date(base.getFullYear(), base.getMonth(), 1), { weekStartsOn: 0 })
  return addWeeks(monthStart, weekIdx)
}

export function ScheduleGrid({
  store,
  canEdit,
  employees: initialEmployees,
  initialData,
  weekStartDate,
  currentUser,
}: ScheduleGridProps) {
  const [weekIdx, setWeekIdx] = useState(0)
  const [gridData, setGridData] = useState<GridData>(initialData)
  const [loading, setLoading] = useState(false)
  const [emailState, setEmailState] = useState<'idle' | 'loading' | 'sent'>('idle')
  const [employees] = useState<string[]>(initialEmployees)
  const [toast, setToast] = useState<string | null>(null)
  const gridRef = useRef<HTMLDivElement>(null)

  const weekStart = getWeekStart(weekIdx)
  const weekStartStr = format(weekStart, 'yyyy-MM-dd')

  // Fetch data when store or week changes
  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      try {
        const res = await fetch(`/api/schedule?storeId=${store.id}&weekStart=${weekStartStr}`)
        if (res.ok) {
          const { data } = await res.json()
          const newGrid: GridData = {}
          for (const row of data) {
            if (!newGrid[row.employeeName]) newGrid[row.employeeName] = {}
            newGrid[row.employeeName][row.dayOfWeek] = row.shiftValue ?? ''
          }
          setGridData(newGrid)
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

  return (
    <div className="p-6">
      {/* Week navigation */}
      <WeekNav
        weekIdx={weekIdx}
        totalWeeks={TOTAL_WEEKS}
        weekStart={weekStart}
        onPrev={() => setWeekIdx((i) => Math.max(0, i - 1))}
        onNext={() => setWeekIdx((i) => Math.min(TOTAL_WEEKS - 1, i + 1))}
        canEmail={canEdit}
        emailState={emailState}
        onEmail={handleEmail}
      />

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
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

      {/* Shift legend */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
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
          <span className="ml-auto text-xs text-slate-400 hidden sm:inline">
            Click to type · Right-click for quick-set
          </span>
        )}
      </div>

      {/* Schedule grid */}
      <div
        id="schedule-grid"
        ref={gridRef}
        className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-x-auto"
      >
        {loading ? (
          <div className="p-8 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-10 bg-slate-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <table className="w-full min-w-[700px] border-collapse">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left px-4 py-3 w-44">
                  <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                    Employee
                  </span>
                </th>
                {DAYS.map((day, i) => {
                  const dayDate = addDays(weekStart, i)
                  const dayKey = DAY_KEYS[i]
                  const storeHour = storeHours[dayKey] ?? ''
                  return (
                    <th key={day} className="px-2 py-3 text-center">
                      <div className="text-xs font-semibold text-slate-700">{day}</div>
                      <div className="text-xs text-slate-400 font-normal">{format(dayDate, 'd')}</div>
                      {storeHour && (
                        <div className="text-xs text-slate-400 font-normal mt-0.5">{storeHour}</div>
                      )}
                    </th>
                  )
                })}
                <th className="px-4 py-3 text-center">
                  <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                    Total
                  </span>
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
                  <tr key={emp} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        <Avatar name={emp} size="sm" color={store.color} />
                        <span className="text-sm font-medium text-slate-800 truncate">{emp}</span>
                      </div>
                    </td>
                    {[0, 1, 2, 3, 4, 5, 6].map((day) => (
                      <td key={day} className="px-1.5 py-1.5">
                        <ShiftCell
                          value={empData[day] ?? ''}
                          onChange={(val) => handleCellChange(emp, day, val)}
                          readOnly={!canEdit}
                          storeColor={store.color}
                        />
                      </td>
                    ))}
                    <td className="px-4 py-2 text-center">
                      <div
                        className="text-sm font-bold"
                        style={{ color: store.color }}
                      >
                        {weekTotal}h
                      </div>
                      {isOT && (
                        <div className="text-xs font-semibold text-red-600">OT</div>
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
