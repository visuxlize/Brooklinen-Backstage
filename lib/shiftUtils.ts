export const SHIFT_TYPES = {
  PTO: { hours: 8, bg: 'bg-blue-50', text: 'text-blue-800', border: 'border-blue-200', label: 'PTO', icon: 'Palmtree' },
  COMP: { hours: 8, bg: 'bg-violet-50', text: 'text-violet-800', border: 'border-violet-200', label: 'COMP', icon: 'RefreshCw' },
  SICK: { hours: 0, bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200', label: 'Sick', icon: 'Thermometer' },
  OFF: { hours: 0, bg: 'bg-red-50', text: 'text-red-800', border: 'border-red-200', label: 'Off', icon: 'X' },
  'N/A': { hours: 0, bg: 'bg-red-50 dark:bg-red-900/30', text: 'text-red-800 dark:text-red-200', border: 'border-red-200 dark:border-red-800', label: 'N/A', icon: 'X' },
} as const

const TIME_RANGE_REGEX = /^(\d+)(?::(\d+))?\s*(AM|PM)?\s*[-–]\s*(\d+)(?::(\d+))?\s*(AM|PM)?$/i

function parseTimeRangeToMinutes(val: string): { start: number; end: number } | null {
  const m = val.match(TIME_RANGE_REGEX)
  if (!m) return null
  const startH = parseInt(m[1], 10)
  const startM = parseInt(m[2] ?? '0', 10) || 0
  const endH = parseInt(m[4], 10)
  const endM = parseInt(m[5] ?? '0', 10) || 0
  const sm = (m[3] ?? '').toUpperCase()
  const em = (m[6] ?? 'PM').toUpperCase()
  let s = startH * 60 + startM
  let e = endH * 60 + endM
  if (sm === 'PM' && startH !== 12) s += 12 * 60
  if (sm === 'AM' && startH === 12) s = 0
  if (em === 'PM' && endH !== 12) e += 12 * 60
  if (em === 'AM' && endH === 12) e = 0
  return { start: s, end: e }
}

export function parseHours(val: string | null | undefined): number {
  if (!val || val.trim() === '') return 0
  const upper = val.trim().toUpperCase().replace(/\s+/g, '')
  const normalized = upper === 'NA' ? 'N/A' : upper
  if (SHIFT_TYPES[normalized as keyof typeof SHIFT_TYPES]) {
    return SHIFT_TYPES[normalized as keyof typeof SHIFT_TYPES].hours
  }
  const range = parseTimeRangeToMinutes(upper)
  if (!range) return 0
  return Math.max(0, Math.round((range.end - range.start) / 60))
}

export function getShiftType(val: string | null | undefined) {
  if (!val) return null
  const u = val.trim().toUpperCase().replace(/\s+/g, '')
  const key = u === 'NA' ? 'N/A' : u
  return SHIFT_TYPES[key as keyof typeof SHIFT_TYPES] ?? null
}

/** Parse "HH:mm" to minutes since midnight. */
export function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return (h ?? 0) * 60 + (m ?? 0)
}

/** Get shift start/end in minutes for a value like "10AM-6PM" or "9 AM - 5:30 PM". Returns null for empty or quick-set only. */
export function shiftBoundsMinutes(val: string | null | undefined): { start: number; end: number } | null {
  if (!val || val.trim() === '') return null
  const upper = val.trim().toUpperCase()
  if (SHIFT_TYPES[upper as keyof typeof SHIFT_TYPES]) return null
  return parseTimeRangeToMinutes(upper)
}

/** Check if shift value fits within availability window (start/end in "HH:mm"). */
export function shiftFitsInWindow(
  shiftValue: string | null | undefined,
  windowStart: string | undefined,
  windowEnd: string | undefined
): boolean {
  if (!windowStart || !windowEnd) return true
  const bounds = shiftBoundsMinutes(shiftValue)
  if (!bounds) return true // OFF/PTO/etc or invalid — allow
  const wStart = timeToMinutes(windowStart)
  const wEnd = timeToMinutes(windowEnd)
  return bounds.start >= wStart && bounds.end <= wEnd
}

/** Format 24h "HH:mm" to 12h "HH:MM AM/PM" (two-digit hour). */
export function formatTime24to12(t: string | undefined): string {
  if (!t || !t.trim()) return ''
  const [hStr, mStr] = t.trim().split(':')
  let h = parseInt(hStr ?? '0', 10)
  const m = parseInt(mStr ?? '0', 10)
  const ampm = h >= 12 ? 'PM' : 'AM'
  if (h === 0) h = 12
  else if (h > 12) h -= 12
  const hh = String(h).padStart(2, '0')
  const mm = String(m).padStart(2, '0')
  return `${hh}:${mm} ${ampm}`
}

/** Convert minutes since midnight to "HH:MM AM/PM" (two-digit hour). */
function minutesTo12h(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24
  const m = minutes % 60
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h
  const hh = String(h12).padStart(2, '0')
  const mm = String(m).padStart(2, '0')
  return `${hh}:${mm} ${ampm}`
}

/** Normalize any time-range input to "HH:MM AM/PM – HH:MM AM/PM"; leave PTO/OFF/etc as-is (uppercase). */
export function normalizeShiftDisplay(val: string | null | undefined): string {
  if (!val || !val.trim()) return ''
  const trimmed = val.trim()
  const upper = trimmed.toUpperCase()
  if (SHIFT_TYPES[upper as keyof typeof SHIFT_TYPES]) return upper
  const bounds = shiftBoundsMinutes(trimmed)
  if (!bounds) return trimmed
  return `${minutesTo12h(bounds.start)} – ${minutesTo12h(bounds.end)}`
}
