/**
 * Traffic Excel parser — exact file structure: 2 sheets.
 * Sheet 1: "Last 5 Weeks Traffic Trends" (row 3 = data)
 * Sheet 2: "Historical Week Data - Last Com" (53 weeks × 11 hours, E-K = Sun-Sat)
 */

export function normalizeDate(raw: unknown): string {
  if (raw instanceof Date) return raw.toISOString().slice(0, 10)
  if (typeof raw === 'number') {
    const d = new Date(Date.UTC(1899, 11, 30) + raw * 86400000)
    return d.toISOString().slice(0, 10)
  }
  return String(raw ?? '').slice(0, 10)
}

export type ParsedTrafficExcel = {
  storeName: string
  trendMultiplier: number
  trafficCount: number
  weeklyTotals: Record<string, [number, number, number, number, number, number, number]>
  hourlyByDay: Record<string, Record<number, number[]>>
}

const SHEET1_NAME = 'Last 5 Weeks Traffic Trends'
const SHEET2_NAME = 'Historical Week Data - Last Com'
const HOUR_LABELS = ['10AM', '11AM', '12PM', '1PM', '2PM', '3PM', '4PM', '5PM', '6PM', '7PM', '8PM']

type SheetToJson = (sheet: unknown, opts: { header: number; defval: unknown }) => (unknown)[][]

/** Parse workbook: Sheet1 row 3 = A=storeName, B=trafficCount, C=trendMultiplier; Sheet2 = 53×11 rows, sum by week. */
export function parseTrafficExcel(
  workbook: {
    SheetNames: string[]
    Sheets: Record<string, unknown>
  },
  utils: { sheet_to_json: SheetToJson }
): ParsedTrafficExcel | null {
  const sheet1Name = workbook.SheetNames.find(
    (n) => n.trim() === SHEET1_NAME || n.replace(/\s+/g, ' ').trim() === SHEET1_NAME
  )
  const sheet2Name = workbook.SheetNames.find(
    (n) =>
      n.trim() === SHEET2_NAME ||
      n.replace(/\s+/g, ' ').trim() === SHEET2_NAME ||
      /historical\s*week\s*data/i.test(n)
  )
  if (!sheet1Name || !sheet2Name) return null

  const sheet1 = workbook.Sheets[sheet1Name] as { [cell: string]: { v?: unknown } }
  if (!sheet1) return null
  const storeName = String(sheet1['A3']?.v ?? '').trim()
  const trafficCount = Math.round(Number(sheet1['B3']?.v ?? 0) || 0)
  const trendMultiplier = Number(sheet1['C3']?.v ?? 0)
  if (Number.isNaN(trendMultiplier)) return null

  const sheet2 = workbook.Sheets[sheet2Name]
  if (!sheet2) return null

  const weeklyTotals: Record<string, [number, number, number, number, number, number, number]> = {}
  const hourlyByDay: Record<string, Record<number, number[]>> = {}
  HOUR_LABELS.forEach((h) => {
    hourlyByDay[h] = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] }
  })

  const rows = utils.sheet_to_json(sheet2, { header: 1, defval: null }) as (unknown)[][]
  for (let i = 2; i < rows.length; i++) {
    const row = rows[i]
    if (!row || !Array.isArray(row)) continue
    const rawDate = row[1]
    const hourLabel = row[3] != null ? String(row[3]).trim() : ''
    if (rawDate == null && !hourLabel) continue

    const weekStr = normalizeDate(rawDate)
    if (!weekStr || weekStr.length < 10) continue
    if (!weeklyTotals[weekStr])
      weeklyTotals[weekStr] = [0, 0, 0, 0, 0, 0, 0]

    for (let d = 0; d < 7; d++) {
      const val = Number(row[4 + d]) || 0
      weeklyTotals[weekStr][d] += val
      if (hourLabel && hourlyByDay[hourLabel] && hourlyByDay[hourLabel][d])
        hourlyByDay[hourLabel][d].push(val)
    }
  }

  return { storeName, trendMultiplier, trafficCount, weeklyTotals, hourlyByDay }
}

/** 5 schedule weeks: this Sunday + next 4 Sundays. */
export function getScheduleWeeks(today = new Date()): Date[] {
  const dayOfWeek = today.getDay()
  const thisSunday = new Date(today)
  thisSunday.setDate(today.getDate() - dayOfWeek)
  thisSunday.setHours(0, 0, 0, 0)
  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(thisSunday)
    d.setDate(thisSunday.getDate() + i * 7)
    return d
  })
}

export type ProjectionWeek = {
  weekStart: string
  lyTotal: number
  projTotal: number
  dayShares: number[]
  lyWeek: string | null
}

/** LY = 364 days back; only use match within 10 days. */
export function computeProjection(
  scheduleWeekDate: Date,
  weeklyTotals: Record<string, [number, number, number, number, number, number, number]>,
  trendMultiplier: number
): ProjectionWeek {
  const lyTarget = new Date(scheduleWeekDate)
  lyTarget.setDate(scheduleWeekDate.getDate() - 364)

  const allWeekDates = Object.keys(weeklyTotals)
  let bestKey: string | null = null
  let bestDiff = Infinity

  for (const wk of allWeekDates) {
    const wkDate = new Date(wk + 'T12:00:00')
    const diff = Math.abs(wkDate.getTime() - lyTarget.getTime()) / (1000 * 60 * 60 * 24)
    if (diff < bestDiff) {
      bestDiff = diff
      bestKey = wk
    }
  }

  if (!bestKey || bestDiff > 10)
    return {
      weekStart: scheduleWeekDate.toISOString().slice(0, 10),
      lyTotal: 0,
      projTotal: 0,
      dayShares: [1 / 7, 1 / 7, 1 / 7, 1 / 7, 1 / 7, 1 / 7, 1 / 7],
      lyWeek: null,
    }

  const lyDays = weeklyTotals[bestKey]
  const projDays = lyDays.map((v) => Math.max(0, v * (1 + trendMultiplier)))
  const projTotal = Math.round(projDays.reduce((a, b) => a + b, 0))
  const lyTotal = lyDays.reduce((a, b) => a + b, 0)
  const dayShares = projDays.map((p) => (projTotal > 0 ? p / projTotal : 1 / 7))

  return {
    weekStart: scheduleWeekDate.toISOString().slice(0, 10),
    lyTotal,
    projTotal,
    dayShares,
    lyWeek: bestKey,
  }
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

/** Peak day = day with highest average weekly traffic across all weeks. */
export function computePeakDay(
  weeklyTotals: Record<string, [number, number, number, number, number, number, number]>
): string {
  const weeks = Object.keys(weeklyTotals)
  if (weeks.length === 0) return '—'
  const daySums = [0, 0, 0, 0, 0, 0, 0]
  for (const wk of weeks) {
    for (let d = 0; d < 7; d++) daySums[d] += weeklyTotals[wk][d]
  }
  const dayAvgs = daySums.map((s) => s / weeks.length)
  const maxIdx = dayAvgs.reduce((best, v, i) => (v > dayAvgs[best] ? i : best), 0)
  return dayAvgs[maxIdx] > 0 ? DAYS[maxIdx] : '—'
}

export type PeakHourRow = {
  day: string
  peak1: string
  peak2: string
  slowHour: string
  busyWindow: string
  windowPct: string
}

/** Full derived state for UI after upload (all sections). */
export type TrafficUploadResult = {
  storeName: string
  trendMultiplier: number
  trafficCount: number
  weeklyTotal: number
  peakDay: string
  recentWeekBreakdown: [number, number, number, number, number, number, number]
  historyTable: Array<{ weekOf: string; days: number[]; total: number }>
  projections: ProjectionWeek[]
  peakHours: PeakHourRow[]
  mostRecentWeek: string
}

/** Build full UI state from parsed Excel. */
export function buildUploadResult(parsed: ParsedTrafficExcel): TrafficUploadResult {
  const sortedWeeks = Object.keys(parsed.weeklyTotals).sort()
  const mostRecentWk = sortedWeeks[sortedWeeks.length - 1] ?? ''
  const recentBreakdown = mostRecentWk
    ? parsed.weeklyTotals[mostRecentWk]
    : ([0, 0, 0, 0, 0, 0, 0] as [number, number, number, number, number, number, number])
  const weeklyTotal = recentBreakdown.reduce((a, b) => a + b, 0)
  const peakDay = computePeakDay(parsed.weeklyTotals)
  const scheduleWeeks = getScheduleWeeks()
  const projections = scheduleWeeks.map((d) =>
    computeProjection(d, parsed.weeklyTotals, parsed.trendMultiplier)
  )
  const peakHours = computePeakHours(parsed.hourlyByDay)
  const historyTable = [...sortedWeeks].reverse().map((wk) => ({
    weekOf: wk,
    days: [...parsed.weeklyTotals[wk]],
    total: parsed.weeklyTotals[wk].reduce((a, b) => a + b, 0),
  }))

  return {
    storeName: parsed.storeName,
    trendMultiplier: parsed.trendMultiplier,
    trafficCount: parsed.trafficCount,
    weeklyTotal,
    peakDay,
    recentWeekBreakdown: recentBreakdown,
    historyTable,
    projections,
    peakHours,
    mostRecentWeek: mostRecentWk,
  }
}

/** Return true if Excel store name matches current store (by id or name). */
export function storeNameMatches(excelStoreName: string, storeId: number, storeName: string): boolean {
  const s = String(excelStoreName ?? '').trim()
  if (!s) return false
  if (s.includes(storeName)) return true
  if (s.includes(String(storeId))) return true
  const withoutNumber = s.replace(/^\d+\s*/, '').trim()
  if (withoutNumber.toLowerCase() === storeName.toLowerCase()) return true
  return false
}

/** Peak hours from hourlyByDay: avg per hour per day across weeks, then peak/slow/window. */
export function computePeakHours(
  hourlyByDay: Record<string, Record<number, number[]>>
): PeakHourRow[] {
  return DAYS.map((dayName, dow) => {
    const hourAvgs = HOUR_LABELS.map((hr) => {
      const vals = hourlyByDay[hr]?.[dow] ?? []
      const avg = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0
      return { hour: hr, avg }
    })

    const dailyTotal = hourAvgs.reduce((s, h) => s + h.avg, 0)
    const sorted = [...hourAvgs].sort((a, b) => b.avg - a.avg)

    const peak1 = sorted[0] ?? { hour: '12PM', avg: 0 }
    const peak2 = sorted[1] ?? { hour: '1PM', avg: 0 }
    const slow = sorted[sorted.length - 1] ?? { hour: '8PM', avg: 0 }

    const top3 = sorted
      .slice(0, 3)
      .map((h) => h.hour)
      .sort((a, b) => HOUR_LABELS.indexOf(a) - HOUR_LABELS.indexOf(b))
    const windowStart = top3[0] ?? '10AM'
    const lastHrIdx = HOUR_LABELS.indexOf(top3[top3.length - 1] ?? '8PM')
    const windowEnd = lastHrIdx < HOUR_LABELS.length - 1 ? HOUR_LABELS[lastHrIdx + 1] : '9PM'
    const top3Sum = sorted.slice(0, 3).reduce((s, h) => s + h.avg, 0)
    const windowPct = dailyTotal > 0 ? top3Sum / dailyTotal : 0

    return {
      day: dayName,
      peak1: `${peak1.hour} (${Math.round(peak1.avg)} avg)`,
      peak2: `${peak2.hour} (${Math.round(peak2.avg)} avg)`,
      slowHour: slow.hour,
      busyWindow: `${windowStart} – ${windowEnd}`,
      windowPct: `${Math.round(windowPct * 100)}%`,
    }
  })
}
