import { parsePaidHours } from './shiftUtils'

/** RTO request as returned from API / used in schedule. */
export interface RtoRequestForSchedule {
  id: string
  employeeName: string
  type: string // 'RTO' | 'PTO' | 'Partial' | 'COMP' | 'Sick'
  status: string // 'pending' | 'approved' | 'denied'
  startDate: string | null // 'YYYY-MM-DD'
  endDate: string | null
  requestedDays?: string
}

export type CellValueResult =
  | { type: 'OFF'; source: 'RTO' }
  | { type: 'PTO'; source: 'PTO' }
  | { type: 'SHIFT'; value: string }
  | { type: 'EMPTY' }

export function isDateInRange(dateStr: string, startStr: string | null, endStr: string | null): boolean {
  if (!startStr || !endStr) return false
  const d = new Date(dateStr + 'T00:00:00')
  const s = new Date(startStr + 'T00:00:00')
  const e = new Date(endStr + 'T00:00:00')
  return !Number.isNaN(d.getTime()) && !Number.isNaN(s.getTime()) && !Number.isNaN(e.getTime()) && d >= s && d <= e
}

function normalizeName(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase()
}

/**
 * Resolve cell value for schedule: approved RTO → OFF, approved PTO → PTO, else manual shift or empty.
 * Uses employeeName for matching (schedule uses names from users table).
 */
export function getCellValue(
  employeeName: string,
  date: Date,
  manualShift: string | null | undefined,
  rtoRequests: RtoRequestForSchedule[],
  ptoRequests: RtoRequestForSchedule[]
): CellValueResult {
  const dateStr = date.toISOString().slice(0, 10)

  const approvedRTO = rtoRequests.find(
    (r) =>
      normalizeName(r.employeeName, employeeName) &&
      r.status.toLowerCase() === 'approved' &&
      r.type.toUpperCase() === 'RTO' &&
      isDateInRange(dateStr, r.startDate, r.endDate)
  )
  if (approvedRTO) return { type: 'OFF', source: 'RTO' }

  const approvedPTO = ptoRequests.find(
    (r) =>
      normalizeName(r.employeeName, employeeName) &&
      r.status.toLowerCase() === 'approved' &&
      r.type.toUpperCase() === 'PTO' &&
      isDateInRange(dateStr, r.startDate, r.endDate)
  )
  if (approvedPTO) return { type: 'PTO', source: 'PTO' }

  if (manualShift != null && String(manualShift).trim() !== '') return { type: 'SHIFT', value: String(manualShift).trim() }
  return { type: 'EMPTY' }
}

/** Display string for a cell result (for ShiftCell value prop). */
export function cellValueToDisplay(cell: CellValueResult): string {
  if (cell.type === 'OFF') return 'OFF'
  if (cell.type === 'PTO') return 'PTO'
  if (cell.type === 'SHIFT') return cell.value
  return ''
}

/** Paid hours for WTD: PTO = 8, SHIFT = parsePaidHours(value), OFF/EMPTY = 0. */
export function cellValueToHours(cell: CellValueResult): number {
  if (cell.type === 'PTO') return 8
  if (cell.type === 'SHIFT') return parsePaidHours(cell.value)
  return 0
}

/**
 * Parse human date string into start/end YYYY-MM-DD.
 * Handles: "March 8th - 14th", "Mar 6 – 8, 2026", "March 1st", "2026-03-08"
 */
export function parseRTODates(dateString: string): { startDate: string; endDate: string } | null {
  const months: Record<string, number> = {
    january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
    july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
    jan: 1, feb: 2, mar: 3, apr: 4, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
  }
  const s = dateString.toLowerCase().replace(/[^\w\s\-–]/g, ' ').replace(/\s+/g, ' ').trim()
  const yr = (() => {
    const match = s.match(/(\d{4})/)
    return match ? parseInt(match[1], 10) : new Date().getFullYear()
  })()

  const single = s.match(/^([a-z]+)\s+(\d+)$/) ?? s.match(/^([a-z]+)\s+(\d+)(?:\s|$)/)
  if (single && !s.includes('-') && !s.includes('–')) {
    const m = months[single[1]]
    const d = parseInt(single[2], 10)
    if (m != null && !Number.isNaN(d)) {
      const ds = `${yr}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      return { startDate: ds, endDate: ds }
    }
  }

  const range = s.match(/([a-z]+)\s+(\d+)[\s\-–]+(\d+)/)
  if (range) {
    const m = months[range[1]]
    const d1 = parseInt(range[2], 10)
    const d2 = parseInt(range[3], 10)
    if (m != null && !Number.isNaN(d1) && !Number.isNaN(d2)) {
      const pad = (n: number) => String(n).padStart(2, '0')
      return {
        startDate: `${yr}-${pad(m)}-${pad(d1)}`,
        endDate: `${yr}-${pad(m)}-${pad(d2)}`,
      }
    }
  }

  const iso = s.match(/(\d{4}-\d{2}-\d{2})/)
  if (iso) return { startDate: iso[1], endDate: iso[1] }

  return null
}

/**
 * Ensure request has startDate/endDate; fill from requestedDays if missing.
 */
export function ensureRtoRequestDates(
  r: RtoRequestForSchedule
): RtoRequestForSchedule & { startDate: string; endDate: string } | null {
  if (r.startDate && r.endDate) return r as RtoRequestForSchedule & { startDate: string; endDate: string }
  const parsed = r.requestedDays ? parseRTODates(r.requestedDays) : null
  if (!parsed) return null
  return { ...r, startDate: parsed.startDate, endDate: parsed.endDate }
}
