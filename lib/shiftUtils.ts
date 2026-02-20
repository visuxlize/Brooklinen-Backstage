export const SHIFT_TYPES = {
  PTO: { hours: 8, bg: 'bg-blue-50', text: 'text-blue-800', border: 'border-blue-200', label: 'PTO', icon: 'Palmtree' },
  COMP: { hours: 8, bg: 'bg-violet-50', text: 'text-violet-800', border: 'border-violet-200', label: 'COMP', icon: 'RefreshCw' },
  SICK: { hours: 0, bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200', label: 'Sick', icon: 'Thermometer' },
  OFF: { hours: 0, bg: 'bg-red-50', text: 'text-red-800', border: 'border-red-200', label: 'Off', icon: 'X' },
} as const

export function parseHours(val: string | null | undefined): number {
  if (!val || val.trim() === '') return 0
  const upper = val.trim().toUpperCase()
  if (SHIFT_TYPES[upper as keyof typeof SHIFT_TYPES]) {
    return SHIFT_TYPES[upper as keyof typeof SHIFT_TYPES].hours
  }
  const m = upper.match(/^(\d+)(AM|PM)?[-–](\d+)(AM|PM)?$/)
  if (!m) return 0
  let s = parseInt(m[1])
  let e = parseInt(m[3])
  const sm = m[2]
  const em = m[4] || 'PM'
  if (sm === 'PM' && s !== 12) s += 12
  if (sm === 'AM' && s === 12) s = 0
  if (em === 'PM' && e !== 12) e += 12
  if (em === 'AM' && e === 12) e = 0
  return Math.max(0, e - s)
}

export function getShiftType(val: string | null | undefined) {
  if (!val) return null
  return SHIFT_TYPES[val.trim().toUpperCase() as keyof typeof SHIFT_TYPES] ?? null
}
