'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { useDailyOps } from '@/lib/daily-ops/DailyOpsContext'
import { SHIFT_ROLES, SHIFT_ROLE_COLORS, type ShiftRole } from '@/lib/daily-ops/types'
import { formatCurrency } from '@/lib/daily-ops/formatters'

/** Quick Set context menu options: label, background hex, role key for storage. */
const ZONING_QUICK_SET_OPTIONS: { label: string; role: ShiftRole }[] = [
  { label: 'LOD', role: 'LOD' },
  { label: 'Floor Support', role: 'Floor Support' },
  { label: 'Visual', role: 'Visual' },
  { label: 'Opening', role: 'Opening' },
  { label: 'Stockroom', role: 'Stockroom' },
  { label: 'Lunch / Meal Break', role: 'Lunch' },
]

const SLOT_COUNT = 9
/** 15-min blocks from 8:00 AM (index 0) to 9:00 PM (index 52). */
const QUARTER_COUNT = 53

/** Hour blocks for header: each spans 4 columns (four 15-min slots) except 9:00 PM which spans 1. */
const HOUR_HEADERS: { colSpan: number; label: string }[] = (() => {
  const out: { colSpan: number; label: string }[] = []
  for (let h = 8; h <= 21; h++) {
    const span = h === 21 ? 1 : 4 // 9:00 PM = 1 slot
    const label = h === 12 ? '12:00 PM' : h > 12 ? `${h - 12}:00 PM` : `${h}:00 AM`
    out.push({ colSpan: span, label })
  }
  return out
})()

/** Consecutive quarters with the same role → one merged block per run. */
function getRuns(quarterRoles: Record<number, string>): { role: string; start: number; end: number }[] {
  const runs: { role: string; start: number; end: number }[] = []
  for (let q = 0; q < QUARTER_COUNT; q++) {
    const role = quarterRoles[q] ?? ''
    if (runs.length > 0 && runs[runs.length - 1].role === role) {
      runs[runs.length - 1].end = q
    } else {
      runs.push({ role, start: q, end: q })
    }
  }
  return runs
}

/** True when this quarter index is the last 15-min of an hour. */
function isHourBoundary(q: number): boolean {
  return (q + 1) % 4 === 0 || q === QUARTER_COUNT - 1
}

function quarterIndexToTime(q: number): string {
  const h = 8 + Math.floor(q / 4)
  const m = (q % 4) * 15
  if (h > 12) return `${h - 12}:${m === 0 ? '00' : m} PM`
  if (h === 12) return `12:${m === 0 ? '00' : m} PM`
  return `${h}:${m === 0 ? '00' : m} AM`
}

/** Dark text for zone blocks and legend — pastel backgrounds use this for legibility. */
const ZONE_LABEL_TEXT_COLOR = '#1a1a1a'

/**
 * Zoning chart: 8 AM–9 PM in 15-min blocks. Drag a role from the legend onto the grid, or select a role then click-and-drag over cells to fill a range.
 * Consecutive same-role blocks are merged and show the zone name (from the legend).
 */
export function ZoningChart() {
  const { selectedStore, employees, setEmployeeSlot, activeEmployeeCount, netRevBudget } = useDailyOps()
  const [roster, setRoster] = useState<string[]>([])
  const [selectedRole, setSelectedRole] = useState<ShiftRole | null>(null)
  /** When user is dragging over the grid to select a range: row index and [startQ, endQ] (inclusive). */
  const [dragRange, setDragRange] = useState<{ employeeIndex: number; startQ: number; endQ: number } | null>(null)
  const dragRoleRef = useRef<string | null>(null)
  const didDragRef = useRef(false)

  const spaGoal =
    netRevBudget != null && netRevBudget > 0 && activeEmployeeCount > 0
      ? netRevBudget / activeEmployeeCount
      : null

  useEffect(() => {
    if (!selectedStore) {
      setRoster([])
      return
    }
    fetch(`/api/employees?storeId=${encodeURIComponent(selectedStore)}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((arr: string[]) => setRoster(Array.isArray(arr) ? arr : []))
      .catch(() => setRoster([]))
  }, [selectedStore])

  const applyRoleToRange = useCallback(
    (employeeIndex: number, startQ: number, endQ: number, role: string) => {
      const slot = employees[employeeIndex] ?? { name: null, role: null, shift: null, meal: null, quarterRoles: {} }
      const next = { ...(slot.quarterRoles ?? {}) }
      const lo = Math.min(startQ, endQ)
      const hi = Math.max(startQ, endQ)
      for (let q = lo; q <= hi; q++) {
        if (role) next[q] = role
        else delete next[q]
      }
      setEmployeeSlot(employeeIndex, { quarterRoles: next })
    },
    [employees, setEmployeeSlot]
  )

  /** Right-click context menu: one cell (employeeIndex, quarterIndex). Shown for every cell. */
  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
    employeeIndex: number
    quarterIndex: number
  } | null>(null)

  const clearContextMenu = useCallback(() => setContextMenu(null), [])

  useEffect(() => {
    if (!contextMenu) return
    const handle = () => clearContextMenu()
    window.addEventListener('click', handle)
    window.addEventListener('scroll', handle, true)
    return () => {
      window.removeEventListener('click', handle)
      window.removeEventListener('scroll', handle, true)
    }
  }, [contextMenu, clearContextMenu])

  const applyQuickSet = useCallback(
    (role: ShiftRole | '') => {
      if (!contextMenu) return
      const { employeeIndex, quarterIndex } = contextMenu
      applyRoleToRange(employeeIndex, quarterIndex, quarterIndex, role)
      clearContextMenu()
    },
    [contextMenu, applyRoleToRange, clearContextMenu]
  )

  const handleCellClick = (employeeIndex: number, quarterIndex: number) => {
    if (!selectedRole) return
    applyRoleToRange(employeeIndex, quarterIndex, quarterIndex, selectedRole)
  }

  const handleMouseDown = (employeeIndex: number, quarterIndex: number) => {
    const role = selectedRole ?? dragRoleRef.current
    if (!role) return
    didDragRef.current = false
    setDragRange({ employeeIndex, startQ: quarterIndex, endQ: quarterIndex })
    dragRoleRef.current = role
  }

  const handleMouseEnterCell = (employeeIndex: number, quarterIndex: number) => {
    if (dragRange === null || dragRange.employeeIndex !== employeeIndex) return
    setDragRange((prev) => prev ? { ...prev, endQ: quarterIndex } : null)
  }

  const handleMouseUp = () => {
    if (dragRange && dragRoleRef.current) {
      didDragRef.current = true
      const { employeeIndex, startQ, endQ } = dragRange
      applyRoleToRange(employeeIndex, startQ, endQ, dragRoleRef.current)
    }
    setDragRange(null)
    dragRoleRef.current = null
  }

  useEffect(() => {
    if (dragRange === null) return
    const onUp = () => handleMouseUp()
    window.addEventListener('mouseup', onUp)
    return () => window.removeEventListener('mouseup', onUp)
  }, [dragRange])

  if (!selectedStore) {
    return (
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Select a store to see the zoning chart.
      </p>
    )
  }

  return (
    <div className="flex flex-col lg:flex-row gap-4 w-full min-w-0 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800/50 shadow-sm overflow-hidden">
      {/* Grid: takes available width, scrolls horizontally on small screens */}
      <div className="flex-1 min-w-0 overflow-x-auto">
        <table className="w-full border-collapse text-sm min-w-[720px]">
          <thead>
            <tr className="border-b-2 border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/80">
              <th className="text-left py-3 px-3 font-semibold text-slate-700 dark:text-slate-300 min-w-[140px] w-40 sticky left-0 bg-slate-50 dark:bg-slate-800/95 z-10 border-r border-slate-200 dark:border-slate-600">Name</th>
              <th className="text-left py-3 px-3 font-semibold text-slate-700 dark:text-slate-300 w-24 border-r border-slate-200 dark:border-slate-600">Shift</th>
              <th className="text-left py-3 px-3 font-semibold text-slate-700 dark:text-slate-300 w-24 border-r border-slate-200 dark:border-slate-600">Meal</th>
              <th className="text-right py-3 px-3 font-semibold text-slate-700 dark:text-slate-300 w-24 border-r border-slate-200 dark:border-slate-600">Sales Goal</th>
              <th colSpan={QUARTER_COUNT} className="p-0 align-middle border-r-0 bg-slate-100 dark:bg-slate-700/60 min-h-[2.5rem]">
                <div className="relative h-7 min-h-[2.5rem] flex w-full">
                  {Array.from({ length: QUARTER_COUNT }, (_, q) => (
                    <div
                      key={q}
                      className={`flex-1 min-w-[14px] border-r border-slate-200 dark:border-slate-600 ${
                        isHourBoundary(q) ? 'border-r-slate-300 dark:border-r-slate-600' : ''
                      }`}
                    />
                  ))}
                  <div
                    className="absolute inset-0 pointer-events-none grid items-stretch"
                    style={{ gridTemplateColumns: `repeat(${QUARTER_COUNT}, minmax(0, 1fr))` }}
                  >
                    {HOUR_HEADERS.map((hour, idx) => {
                      const startCol = idx === 0 ? 0 : HOUR_HEADERS.slice(0, idx).reduce((s, h) => s + h.colSpan, 0)
                      return (
                        <div
                          key={idx}
                          className="flex items-center justify-center text-[10px] font-bold text-slate-700 dark:text-slate-200"
                          style={{ gridColumn: `${startCol + 1} / span ${hour.colSpan}` }}
                        >
                          {hour.label}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: SLOT_COUNT }).map((_, i) => {
              const slot = employees[i] ?? { name: null, role: null, shift: null, meal: null, quarterRoles: {} }
              const name = slot.name?.trim() ?? ''
              const salesGoal = name && spaGoal != null ? formatCurrency(spaGoal) : '—'
              const quarterRoles = slot.quarterRoles ?? {}
              return (
                <tr key={i} className="border-b border-slate-200 dark:border-slate-600 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="py-2 px-3 sticky left-0 bg-white dark:bg-slate-800/95 z-10 border-r border-slate-200 dark:border-slate-600 min-w-[140px]">
                    <select
                      value={name}
                      onChange={(e) => setEmployeeSlot(i, { name: e.target.value || null })}
                      className="w-full min-w-[120px] px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">—</option>
                      {roster.map((n) => (
                        <option key={n} value={n}>{n}</option>
                      ))}
                    </select>
                  </td>
                  <td className="py-2 px-3 border-r border-slate-200 dark:border-slate-600">
                    <input
                      type="text"
                      placeholder="10:30-7"
                      value={slot.shift ?? ''}
                      onChange={(e) => setEmployeeSlot(i, { shift: e.target.value || null })}
                      className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                    />
                  </td>
                  <td className="py-2 px-3 border-r border-slate-200 dark:border-slate-600">
                    <input
                      type="text"
                      placeholder="2:30-3"
                      value={slot.meal ?? ''}
                      onChange={(e) => setEmployeeSlot(i, { meal: e.target.value || null })}
                      className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                    />
                  </td>
                  <td className="py-2 px-3 text-right font-medium text-slate-700 dark:text-slate-200 text-xs border-r border-slate-200 dark:border-slate-600">{salesGoal}</td>
                  <td colSpan={QUARTER_COUNT} className="p-0 align-top border-r-0">
                    <div className="relative h-7 min-h-[28px] flex w-full">
                      {/* 53 individual 15-min cells for grid and interaction */}
                      {Array.from({ length: QUARTER_COUNT }, (_, q) => {
                        const role = quarterRoles[q] ?? ''
                        const hex = role ? (SHIFT_ROLE_COLORS[role as ShiftRole] ?? '#e5e7eb') : undefined
                        const lo = dragRange ? Math.min(dragRange.startQ, dragRange.endQ) : -1
                        const hi = dragRange ? Math.max(dragRange.startQ, dragRange.endQ) : -1
                        const isInDragRange = dragRange?.employeeIndex === i && q >= lo && q <= hi
                        const runStart = role ? (() => { let s = q; while (s > 0 && (quarterRoles[s - 1] ?? '') === role) s--; return s })() : q
                        const runEnd = role ? (() => { let e = q; while (e < QUARTER_COUNT - 1 && (quarterRoles[e + 1] ?? '') === role) e++; return e })() : q
                        return (
                          <div
                            key={q}
                            className={`flex-1 min-w-[14px] cursor-pointer border-r border-b border-slate-200/60 dark:border-slate-600/60 ${
                              isHourBoundary(q) ? 'border-r-slate-300 dark:border-r-slate-600' : ''
                            } ${isInDragRange ? 'ring-2 ring-blue-500 ring-inset' : 'hover:ring-1 hover:ring-blue-400'} ${!role ? 'bg-slate-50 dark:bg-slate-700/30' : ''}`}
                            style={role ? { backgroundColor: hex } : undefined}
                            title={role ? `${quarterIndexToTime(q)}: ${role}` : quarterIndexToTime(q)}
                            onContextMenu={(e) => {
                              e.preventDefault()
                              setContextMenu({ x: e.clientX, y: e.clientY, employeeIndex: i, quarterIndex: q })
                            }}
                            onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy' }}
                            onDrop={(e) => {
                              e.preventDefault()
                              const r = e.dataTransfer.getData('text/plain')
                              if (!r || !SHIFT_ROLES.includes(r as ShiftRole)) return
                              const runs = getRuns(quarterRoles)
                              const run = runs.find((run) => q >= run.start && q <= run.end)
                              if (run) applyRoleToRange(i, run.start, run.end, r)
                              else applyRoleToRange(i, q, q, r)
                            }}
                            onMouseDown={() => handleMouseDown(i, q)}
                            onMouseEnter={() => handleMouseEnterCell(i, q)}
                            onClick={(e) => {
                              e.stopPropagation()
                              if (!didDragRef.current) handleCellClick(i, q)
                              didDragRef.current = false
                            }}
                          />
                        )
                      })}
                      {/* Label overlay: one centered label per run */}
                      <div
                        className="absolute inset-0 pointer-events-none grid items-stretch"
                        style={{ gridTemplateColumns: `repeat(${QUARTER_COUNT}, minmax(0, 1fr))` }}
                      >
                        {getRuns(quarterRoles).map(
                          (run) =>
                            run.role && (
                              <div
                                key={`${run.start}-${run.end}`}
                                className="flex items-center justify-center text-[10px] font-medium col-span-1"
                                style={{
                                  gridColumn: `${run.start + 1} / span ${run.end - run.start + 1}`,
                                  color: ZONE_LABEL_TEXT_COLOR,
                                }}
                              >
                                {run.role}
                              </div>
                            )
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Zoning Legend — minimal right panel for more space for name/shift/meal and time grid */}
      <div className="lg:w-28 xl:w-32 shrink-0 rounded-r-xl border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/80 p-2">
        <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1">Zones</p>
        <p className="text-[8px] text-slate-500 dark:text-slate-400 mb-1.5 leading-tight">Click/drag role then grid. Right-click block to clear or change.</p>
        <div className="flex flex-col gap-1">
          {SHIFT_ROLES.map((r) => (
            <div
              key={r}
              role="button"
              tabIndex={0}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('text/plain', r)
                e.dataTransfer.effectAllowed = 'copy'
              }}
              onClick={() => setSelectedRole((prev) => (prev === r ? null : r))}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedRole((prev) => (prev === r ? null : r)) } }}
              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded border text-[9px] font-medium cursor-grab active:cursor-grabbing select-none transition-all ${
                selectedRole === r
                  ? 'ring-1 ring-blue-500 ring-offset-0 border-blue-400'
                  : 'border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500'
              }`}
              style={{ backgroundColor: SHIFT_ROLE_COLORS[r], color: ZONE_LABEL_TEXT_COLOR }}
            >
              <span className="w-2 h-2 rounded-full flex-shrink-0 border border-slate-400/50" style={{ backgroundColor: SHIFT_ROLE_COLORS[r] }} />
              <span className="flex-1 text-left min-w-0">{r}</span>
            </div>
          ))}
        </div>
        {selectedRole && (
          <button
            type="button"
            onClick={() => setSelectedRole(null)}
            className="mt-1.5 w-full text-[8px] text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 py-0.5 underline"
          >
            Clear
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            for (let i = 0; i < SLOT_COUNT; i++) setEmployeeSlot(i, { quarterRoles: {} })
          }}
          className="mt-2 w-full text-[9px] font-medium text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 py-1.5 px-2 rounded border border-slate-200 dark:border-slate-600 hover:border-red-300 dark:hover:border-red-700 transition-colors"
        >
          Reset zone grid
        </button>
      </div>

      {/* Right-click Quick Set context menu — portal, one menu at a time, outside click closes */}
      {contextMenu &&
        typeof document !== 'undefined' &&
        createPortal(
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={clearContextMenu}
              aria-hidden
            />
            <div
              className="fixed z-50 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-600 p-3 w-52"
              style={{ left: contextMenu.x + 4, top: contextMenu.y + 4 }}
              role="menu"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-400 mb-2 px-1 pointer-events-none">
                Quick Set
              </div>
              <div className="flex flex-col gap-1">
                {ZONING_QUICK_SET_OPTIONS.map((opt) => {
                  const bg = SHIFT_ROLE_COLORS[opt.role]
                  return (
                    <button
                      key={opt.role}
                      type="button"
                      onClick={() => applyQuickSet(opt.role)}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border border-slate-200/60 dark:border-slate-600/60 text-left transition-colors hover:opacity-90"
                      style={{
                        backgroundColor: bg,
                        color: ZONE_LABEL_TEXT_COLOR,
                      }}
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0 border border-black/15"
                        style={{ backgroundColor: bg }}
                      />
                      {opt.label}
                    </button>
                  )
                })}
                <button
                  type="button"
                  onClick={() => applyQuickSet('')}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors mt-1"
                >
                  <X className="w-3.5 h-3.5 flex-shrink-0" />
                  Clear
                </button>
              </div>
            </div>
          </>,
          document.body
        )}
    </div>
  )
}
