/**
 * Traffic calculations — single source of truth for 5-Week Projection and Peak Hours.
 *
 * DATA SOURCES (after upload/API):
 * - weeklyTrafficHistory: 53 weeks per store with weekStart (YYYY-MM-DD), days [sun..sat]
 * - trendData: { trendMultiplier (decimal e.g. -0.14), recentCount }
 * - scheduleWeeks: 5 Date objects (Sunday of each schedule week)
 * - hourlyTraffic: per store, hour 10–20, dayOfWeek 0–6, avgCount, dailyTotal, pctOfDay
 */

const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const

export type WeeklyTrafficRow = {
  weekStart: string
  sun: number | null
  mon: number | null
  tue: number | null
  wed: number | null
  thu: number | null
  fri: number | null
  sat: number | null
  total?: number | null
  trendMult?: string | null
  trafficCount?: number | null
}

export type HourlyTrafficRow = {
  hour: number
  dayOfWeek: number
  avgCount: number | null
  dailyTotal: number | null
  pctOfDay: number | null
}

export type TrendData = {
  trendMultiplier: number
  recentCount: number | null
}

/** Find closest week in history within 10 days of (scheduleWeek - 1 year). Returns YYYY-MM-DD or null. */
export function findClosestLYWeek(scheduleWeekStr: string, availableWeeks: string[]): string | null {
  const [y, m, d] = scheduleWeekStr.split('-').map(Number)
  const schedDate = new Date(y, m - 1, d)
  const lyTarget = new Date(schedDate)
  lyTarget.setFullYear(lyTarget.getFullYear() - 1)

  let bestKey: string | null = null
  let bestDiff = 999

  for (const weekStr of availableWeeks) {
    const [wy, wm, wd] = weekStr.split('-').map(Number)
    const wDate = new Date(wy, wm - 1, wd)
    const diff = Math.abs((wDate.getTime() - lyTarget.getTime()) / (24 * 60 * 60 * 1000))
    if (diff < bestDiff) {
      bestDiff = diff
      bestKey = weekStr
    }
  }
  return bestDiff <= 10 ? bestKey : null
}

export type ProjectionWeekResult = {
  weekStart: string
  lyTotal: number
  projectedTotal: number
  dayShares: [number, number, number, number, number, number, number] // Sun..Sat
}

/**
 * SECTION 1: 5-Week Projection
 * For each of the 5 schedule weeks:
 * 1. Find closest LY week in weeklyTrafficHistory within 10 days of (scheduleWeek - 1 year)
 * 2. projectedDay = lyDay * (1 + trendMultiplier)
 * 3. dayShare = projectedDay / sum(allProjectedDays)
 * 4. Output: lyTotal, projectedTotal, 7 day-share percentages
 */
export function computeFiveWeekProjection(
  weeklyTrafficHistory: WeeklyTrafficRow[],
  trendData: TrendData,
  scheduleWeeks: string[] // 5 x YYYY-MM-DD (Sundays)
): ProjectionWeekResult[] {
  const availableWeeks = weeklyTrafficHistory.map((r) => r.weekStart).filter(Boolean)
  const mult = trendData.trendMultiplier

  return scheduleWeeks.map((weekStart) => {
    const lyKey = findClosestLYWeek(weekStart, availableWeeks)
    const lyRow = weeklyTrafficHistory.find((r) => r.weekStart === lyKey)
    const lyDays: number[] = lyRow
      ? DAY_KEYS.map((k) => Number(lyRow[k] ?? 0))
      : [0, 0, 0, 0, 0, 0, 0]

    const lyTotal = lyDays.reduce((a, b) => a + b, 0)
    const projectedDays = lyDays.map((t) => Math.max(0, t * (1 + mult)))
    const projectedTotal = projectedDays.reduce((a, b) => a + b, 0)
    const dayShares = (
      projectedTotal > 0
        ? projectedDays.map((p) => p / projectedTotal)
        : [1 / 7, 1 / 7, 1 / 7, 1 / 7, 1 / 7, 1 / 7, 1 / 7]
    ) as [number, number, number, number, number, number, number]

    return { weekStart, lyTotal, projectedTotal, dayShares }
  })
}

export type PeakHourRowResult = {
  dayOfWeek: number
  dayName: string
  peakHour: number
  peakAvg: number
  secondPeakHour: number
  secondPeakAvg: number
  slowHour: number
  busiestWindowStart: number
  busiestWindowEnd: number
  windowPctOfDay: number
}

/**
 * SECTION 2: Peak Hours Summary
 * For each day of week (Sun–Sat):
 * 1. Collect all hours (10–20) with avgCount for that day
 * 2. Sort descending by avgCount
 * 3. peak1, peak2, slowHour, busiest3hrWindow (earliest to latest+1 of top 3), windowPct = sum(top3 avg) / dailyTotal
 */
export function computePeakHoursSummary(
  hourlyTraffic: HourlyTrafficRow[],
  dayNames: readonly string[] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
): PeakHourRowResult[] {
  const HOURS = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]

  return [0, 1, 2, 3, 4, 5, 6].map((dow) => {
    const byHour = hourlyTraffic
      .filter((r) => r.dayOfWeek === dow && HOURS.includes(r.hour))
      .map((r) => ({ hour: r.hour, avg: Number(r.avgCount ?? 0), dailyTotal: Number(r.dailyTotal ?? 0) }))
      .sort((a, b) => b.avg - a.avg)

    const dayTotalFromSum = byHour.reduce((s, x) => s + x.avg, 0)
    const dailyTotal =
      byHour.length > 0 && byHour[0].dailyTotal > 0 ? byHour[0].dailyTotal : dayTotalFromSum

    const peak1 = byHour[0] ?? { hour: 12, avg: 0 }
    const peak2 = byHour[1] ?? { hour: 13, avg: 0 }
    const slow = byHour[byHour.length - 1] ?? { hour: 20, avg: 0 }
    const top3 = byHour.slice(0, 3).map((x) => x.hour).sort((a, b) => a - b)
    const windowStart = top3[0] ?? 10
    const windowEnd = Math.min((top3[top3.length - 1] ?? 20) + 1, 20)
    const top3Sum = byHour.slice(0, 3).reduce((s, x) => s + x.avg, 0)
    const windowPctOfDay = dailyTotal > 0 ? top3Sum / dailyTotal : 0

    return {
      dayOfWeek: dow,
      dayName: dayNames[dow] ?? '?',
      peakHour: peak1.hour,
      peakAvg: peak1.avg,
      secondPeakHour: peak2.hour,
      secondPeakAvg: peak2.avg,
      slowHour: slow.hour,
      busiestWindowStart: windowStart,
      busiestWindowEnd: windowEnd,
      windowPctOfDay,
    }
  })
}

/** Format hour 0–23 as 12AM, 1AM, ... 12PM, 1PM, ... */
export function formatHour(h: number): string {
  if (h === 0) return '12AM'
  if (h < 12) return `${h}AM`
  if (h === 12) return '12PM'
  return `${h - 12}PM`
}
