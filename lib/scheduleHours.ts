/**
 * Budget hours (allowable hours) and trending hours logic per Brooklinen script.
 * - Allowable hours: lookup from weekly net sales (Weekly Allowable Hours table).
 * - Budget hours: distribute allowable hours by fixed day weights.
 * - Trending hours: LY traffic week + trend multiplier → day shares → distribute allowable hours, 16h floor.
 */

const DAY_KEYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const

/** Weekly Allowable Hours lookup: [weeklyNetSales, allowableHours] ascending by sales. Floor 165 for < $30k. */
export const ALLOWABLE_HOURS_LOOKUP: [number, number][] = [
  [30000, 165],
  [35000, 185],
  [40000, 200],
  [50000, 220],
  [60000, 230],
  [70000, 240],
]

/** Default day weights when no traffic data (script DAY_HOUR_WEIGHTS). */
export const DAY_HOUR_WEIGHTS: Record<string, number> = {
  Sun: 0.2,
  Mon: 0.12,
  Tue: 0.11,
  Wed: 0.11,
  Thu: 0.1,
  Fri: 0.13,
  Sat: 0.23,
}

/** Get total allowable hours for the week from weekly budget (net sales). Floor 165 for under $30k. */
export function getAllowableHours(weeklyBudget: number): number {
  if (weeklyBudget < 30000) return 165
  let hours = 165
  for (const [threshold, h] of ALLOWABLE_HOURS_LOOKUP) {
    if (threshold >= 30000 && weeklyBudget >= threshold) hours = h
  }
  return hours
}

/** Distribute allowable hours by fixed day weights. Returns 7 daily values. */
export function getBudgetHoursDaily(allowableHours: number): number[] {
  const daily: number[] = []
  let sum = 0
  for (let d = 0; d < 7; d++) {
    const key = DAY_KEYS[d]
    const h = Math.round(allowableHours * DAY_HOUR_WEIGHTS[key] * 10) / 10
    daily.push(h)
    sum += h
  }
  const drift = Math.round((allowableHours - sum) * 10) / 10
  daily[6] = Math.round((daily[6] + drift) * 10) / 10
  return daily
}

/** Find closest matching week in traffic history (same calendar week LY). Returns YYYY-MM-DD or null. */
export function findClosestLYWeek(
  scheduleWeekStr: string,
  availableWeeks: string[]
): string | null {
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

const MIN_DAY_HOURS = 16

/**
 * Compute trending hours per day from LY traffic + trend multiplier.
 * Steps: projected = LY * (1+mult), day shares, distribute allowable hours, apply 16h floor, redistribute excess.
 */
export function getTrendingHoursDaily(
  allowableHours: number,
  lyTraffic: number[],
  trendMultiplier: number
): number[] {
  if (lyTraffic.length !== 7) return getBudgetHoursDaily(allowableHours)

  const projected = lyTraffic.map((t) => Math.max(0, t * (1 + trendMultiplier)))
  const totalProj = projected.reduce((a, b) => a + b, 0)
  const dayShares =
    totalProj > 0 ? projected.map((p) => p / totalProj) : [1 / 7, 1 / 7, 1 / 7, 1 / 7, 1 / 7, 1 / 7, 1 / 7]

  const raw = dayShares.map((sh) => Math.round(sh * allowableHours * 10) / 10)
  const floored = raw.slice()
  let excess = 0
  for (let d = 0; d < 7; d++) {
    if (floored[d] < MIN_DAY_HOURS) {
      excess += MIN_DAY_HOURS - floored[d]
      floored[d] = MIN_DAY_HOURS
    }
  }
  if (excess > 0.01) {
    const headroom = floored.map((h) => Math.max(0, h - MIN_DAY_HOURS))
    const totalHeadroom = headroom.reduce((a, b) => a + b, 0)
    if (totalHeadroom > 0) {
      let running = 0
      for (let d = 0; d < 6; d++) {
        const reduction = excess * (headroom[d] / totalHeadroom)
        floored[d] = Math.round(Math.max(MIN_DAY_HOURS, floored[d] - reduction) * 10) / 10
        running += floored[d]
      }
      floored[6] = Math.round(Math.max(MIN_DAY_HOURS, allowableHours - running) * 10) / 10
    }
  } else {
    const trendDrift = Math.round((allowableHours - raw.reduce((a, b) => a + b, 0)) * 10) / 10
    floored[6] = Math.round((floored[6] + trendDrift) * 10) / 10
  }
  return floored
}
