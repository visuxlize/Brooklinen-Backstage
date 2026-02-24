'use client'

import { useMemo } from 'react'
import { format, addDays } from 'date-fns'
import { getCellValue, cellValueToDisplay, cellValueToHours, type RtoRequestForSchedule } from '@/lib/scheduleRtoUtils'
import { formatHours } from '@/lib/shiftUtils'
import { formatCurrency } from '@/lib/daily-ops/formatters'
import type { StoreConfig } from '@/lib/stores'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const
const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const

const EMPLOYEE_COL_WIDTH = 160
const WTD_COL_WIDTH = 80
const DAY_COL_WIDTH = 240 // (1920 - 160 - 80) / 7 ≈ 240

export interface ScheduleImageTemplateProps {
  width: number
  store: StoreConfig
  employees: string[]
  initialData: Record<string, Record<number, string>>
  weekStartDate: Date
  dailyBudget: number[]
  dailyLy: number[]
  weeklyBudget: number
  weeklyLy: number
  workload: Record<string, string> | null
  promotions: Record<string, string> | null
  budgetHoursDaily: number[]
  trendingHoursDaily: number[]
  peakWindowByDay: string[]
  allowableHours: number
  initialApprovedRtoRequests: Array<{
    id: string
    employeeName: string
    type: string
    status: string
    startDate: string | null
    endDate: string | null
    requestedDays: string | null
  }>
}

function getInitial(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase()
  return (parts[0].slice(0, 1) + parts[parts.length - 1].slice(0, 1)).toUpperCase()
}

export function ScheduleImageTemplate({
  width,
  store,
  employees,
  initialData,
  weekStartDate,
  dailyBudget,
  dailyLy,
  weeklyBudget,
  weeklyLy,
  workload,
  promotions,
  budgetHoursDaily,
  trendingHoursDaily,
  peakWindowByDay,
  allowableHours,
  initialApprovedRtoRequests,
}: ScheduleImageTemplateProps) {
  const storeHours = (store.hours as Record<string, string>) ?? {}
  const rtoList: RtoRequestForSchedule[] = initialApprovedRtoRequests
    .filter((r) => (r.type ?? '').toUpperCase() === 'RTO')
    .map((r) => ({ ...r, requestedDays: r.requestedDays ?? undefined }))
  const ptoList: RtoRequestForSchedule[] = initialApprovedRtoRequests
    .filter((r) => (r.type ?? '').toUpperCase() === 'PTO')
    .map((r) => ({ ...r, requestedDays: r.requestedDays ?? undefined }))

  const { resolvedData, dayTotals, grandTotal, budgetWtd, trendingWtd } = useMemo(() => {
    const data: Record<string, Record<number, string>> = {}
    for (const emp of employees) {
      data[emp] = {}
      for (let day = 0; day < 7; day++) {
        const dayDate = addDays(weekStartDate, day)
        const cell = getCellValue(emp, dayDate, initialData[emp]?.[day], rtoList, ptoList)
        data[emp][day] = cellValueToDisplay(cell)
      }
    }
    const dayTotals = [0, 1, 2, 3, 4, 5, 6].map((day) =>
      employees.reduce((sum, emp) => {
        const dayDate = addDays(weekStartDate, day)
        const cell = getCellValue(emp, dayDate, initialData[emp]?.[day], rtoList, ptoList)
        return sum + cellValueToHours(cell)
      }, 0)
    )
    const grandTotal = dayTotals.reduce((a, b) => a + b, 0)
    const budgetWtd = budgetHoursDaily.reduce((a, b) => a + b, 0)
    const trendingWtd = trendingHoursDaily.reduce((a, b) => a + b, 0)
    return { resolvedData: data, dayTotals, grandTotal, budgetWtd, trendingWtd }
  }, [employees, initialData, weekStartDate, rtoList, ptoList, budgetHoursDaily, trendingHoursDaily])

  const isOverBudget = grandTotal > allowableHours

  const tableStyle: React.CSSProperties = {
    width: width,
    tableLayout: 'fixed',
    borderCollapse: 'collapse',
    fontSize: '11px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    color: '#1a1a1a',
  }

  const headerStyle: React.CSSProperties = {
    backgroundColor: '#0e1f3d',
    color: 'rgba(255,255,255,0.9)',
    fontWeight: 700,
    fontSize: '12px',
    padding: '10px 8px',
    textAlign: 'left',
    border: '1px solid #e5e7eb',
  }

  const subLabelStyle: React.CSSProperties = {
    fontSize: '10px',
    fontWeight: 400,
    opacity: 0.85,
    marginTop: 2,
  }

  const cellBase: React.CSSProperties = {
    padding: '6px 8px',
    border: '1px solid #e5e7eb',
    verticalAlign: 'middle',
    overflow: 'visible',
  }

  const shiftCellActive: React.CSSProperties = { backgroundColor: '#dbeafe', textAlign: 'center' }
  const shiftCellOff: React.CSSProperties = { backgroundColor: '#fce7f3', color: '#1a1a1a', textAlign: 'center' }

  return (
    <div style={{ width, background: '#fff' }}>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={{ ...headerStyle, width: EMPLOYEE_COL_WIDTH }}>EMPLOYEE</th>
            <th style={{ ...headerStyle, width: WTD_COL_WIDTH, textAlign: 'center' }}>WTD</th>
            {DAYS.map((day, i) => {
              const dayDate = addDays(weekStartDate, i)
              const key = DAY_KEYS[i]
              const hours = storeHours[key] ?? '11AM–7PM'
              return (
                <th key={day} style={{ ...headerStyle, width: DAY_COL_WIDTH, textAlign: 'center' }}>
                  <div>{day}, {format(dayDate, 'MMM d')}</div>
                  <div style={subLabelStyle}>{hours}</div>
                </th>
              )
            })}
          </tr>
          <tr style={{ backgroundColor: '#f1f5f9' }}>
            <td style={{ ...cellBase, width: EMPLOYEE_COL_WIDTH, fontWeight: 600 }}>Daily budget goal</td>
            <td style={{ ...cellBase, width: WTD_COL_WIDTH, textAlign: 'center' }}>{formatCurrency(weeklyBudget)}</td>
            {[0, 1, 2, 3, 4, 5, 6].map((i) => (
              <td key={i} style={{ ...cellBase, width: DAY_COL_WIDTH, textAlign: 'center' }}>{formatCurrency(dailyBudget[i] ?? 0)}</td>
            ))}
          </tr>
          <tr style={{ backgroundColor: '#f8fafc' }}>
            <td style={{ ...cellBase, width: EMPLOYEE_COL_WIDTH, fontWeight: 600 }}>Daily LY budget</td>
            <td style={{ ...cellBase, width: WTD_COL_WIDTH, textAlign: 'center' }}>{formatCurrency(weeklyLy)}</td>
            {[0, 1, 2, 3, 4, 5, 6].map((i) => (
              <td key={i} style={{ ...cellBase, width: DAY_COL_WIDTH, textAlign: 'center' }}>{formatCurrency(dailyLy[i] ?? 0)}</td>
            ))}
          </tr>
          <tr>
            <td style={{ ...cellBase, width: EMPLOYEE_COL_WIDTH, fontWeight: 600 }}>Promotions</td>
            <td style={{ ...cellBase, width: WTD_COL_WIDTH }} />
            {DAY_KEYS.map((key) => (
              <td key={key} style={{ ...cellBase, width: DAY_COL_WIDTH, textAlign: 'center' }}>{promotions?.[key]?.trim() || '—'}</td>
            ))}
          </tr>
          <tr>
            <td style={{ ...cellBase, width: EMPLOYEE_COL_WIDTH, fontWeight: 600 }}>Workload</td>
            <td style={{ ...cellBase, width: WTD_COL_WIDTH }} />
            {DAY_KEYS.map((key) => (
              <td key={key} style={{ ...cellBase, width: DAY_COL_WIDTH, textAlign: 'center' }}>{workload?.[key]?.trim() || '—'}</td>
            ))}
          </tr>
        </thead>
        <tbody>
          {employees.map((emp) => {
            const weekTotal = [0, 1, 2, 3, 4, 5, 6].reduce(
              (sum, day) => sum + cellValueToHours(getCellValue(emp, addDays(weekStartDate, day), initialData[emp]?.[day], rtoList, ptoList)),
              0
            )
            return (
              <tr key={emp}>
                <td style={{ ...cellBase, width: EMPLOYEE_COL_WIDTH }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        backgroundColor: store.color,
                        color: '#fff',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 10,
                        fontWeight: 600,
                        flexShrink: 0,
                      }}
                    >
                      {getInitial(emp)}
                    </span>
                    <span style={{ overflow: 'visible', whiteSpace: 'normal' }}>{emp}</span>
                  </div>
                </td>
                <td style={{ ...cellBase, width: WTD_COL_WIDTH, textAlign: 'center', fontWeight: 700, color: store.color }}>{weekTotal}h</td>
                {[0, 1, 2, 3, 4, 5, 6].map((day) => {
                  const val = resolvedData[emp]?.[day] ?? ''
                  const isOff = val === 'OFF' || val === 'PTO' || val === 'N/A'
                  return (
                    <td
                      key={day}
                      style={{
                        ...cellBase,
                        width: DAY_COL_WIDTH,
                        ...(isOff ? shiftCellOff : shiftCellActive),
                      }}
                    >
                      {val || '—'}
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
        <tfoot>
          <tr style={{ backgroundColor: '#f1f5f9' }}>
            <td style={{ ...cellBase, width: EMPLOYEE_COL_WIDTH, fontWeight: 600 }}>Budget hours</td>
            <td style={{ ...cellBase, width: WTD_COL_WIDTH, textAlign: 'center' }}>{budgetWtd > 0 ? formatHours(budgetWtd) : '—'}</td>
            {[0, 1, 2, 3, 4, 5, 6].map((i) => (
              <td key={i} style={{ ...cellBase, width: DAY_COL_WIDTH, textAlign: 'center' }}>{budgetHoursDaily[i] > 0 ? formatHours(budgetHoursDaily[i]) : '—'}</td>
            ))}
          </tr>
          <tr style={{ backgroundColor: '#f8fafc' }}>
            <td style={{ ...cellBase, width: EMPLOYEE_COL_WIDTH, fontWeight: 600 }}>Trending hours</td>
            <td style={{ ...cellBase, width: WTD_COL_WIDTH, textAlign: 'center' }}>{trendingWtd > 0 ? formatHours(trendingWtd) : '—'}</td>
            {[0, 1, 2, 3, 4, 5, 6].map((i) => (
              <td key={i} style={{ ...cellBase, width: DAY_COL_WIDTH, textAlign: 'center' }}>{trendingHoursDaily[i] > 0 ? formatHours(trendingHoursDaily[i]) : '—'}</td>
            ))}
          </tr>
          <tr style={{ backgroundColor: '#fffbf5' }}>
            <td style={{ ...cellBase, width: EMPLOYEE_COL_WIDTH, fontWeight: 700, fontSize: '10px' }}>POWER HOUR</td>
            <td style={{ ...cellBase, width: WTD_COL_WIDTH, textAlign: 'center' }}>—</td>
            {[0, 1, 2, 3, 4, 5, 6].map((i) => (
              <td key={i} style={{ ...cellBase, width: DAY_COL_WIDTH, textAlign: 'center' }}>{peakWindowByDay[i] ?? '—'}</td>
            ))}
          </tr>
          <tr style={{ backgroundColor: isOverBudget ? '#dc2626' : '#0e1f3d', color: '#fff' }}>
            <td style={{ ...cellBase, width: EMPLOYEE_COL_WIDTH, fontWeight: 700, fontSize: '10px' }}>ACTUAL HOURS</td>
            <td style={{ ...cellBase, width: WTD_COL_WIDTH, textAlign: 'center', fontWeight: 800 }}>{grandTotal > 0 ? `${grandTotal}h` : '0h'}</td>
            {[0, 1, 2, 3, 4, 5, 6].map((i) => (
              <td key={i} style={{ ...cellBase, width: DAY_COL_WIDTH, textAlign: 'center', fontWeight: 700 }}>{dayTotals[i] > 0 ? `${dayTotals[i]}h` : '—'}</td>
            ))}
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
