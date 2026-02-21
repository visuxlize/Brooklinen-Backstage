import { startOfWeek, addWeeks, addDays, differenceInDays } from 'date-fns'

/** First year of the schedule calendar */
export const SCHEDULE_START_YEAR = 2025
/** Last year (inclusive); schedules go through end of this year */
export const SCHEDULE_END_YEAR = 2027

/** Week starts on Sunday (0) */
const WEEK_STARTS_ON = 0

function firstSundayOfYear(year: number): Date {
  return startOfWeek(new Date(year, 0, 1), { weekStartsOn: WEEK_STARTS_ON })
}

function lastSundayOfYear(year: number): Date {
  const dec31 = new Date(year, 11, 31)
  const lastSun = startOfWeek(dec31, { weekStartsOn: WEEK_STARTS_ON })
  if (lastSun.getFullYear() < year) {
    return addWeeks(lastSun, 1)
  }
  return lastSun
}

/** First week start (Sunday) in the schedule calendar: first Sunday of start year */
export const FIRST_WEEK_START = firstSundayOfYear(SCHEDULE_START_YEAR)

/** Last week start (Sunday) in the schedule calendar: last Sunday of end year */
export const LAST_WEEK_START = lastSundayOfYear(SCHEDULE_END_YEAR)

/** Total number of weeks (Sun–Sat) from FIRST_WEEK_START through LAST_WEEK_START */
export function getTotalWeeks(): number {
  const days = differenceInDays(LAST_WEEK_START, FIRST_WEEK_START)
  return Math.floor(days / 7) + 1
}

/**
 * Get the Sunday (week start) date for the given week index.
 * Week 0 = first Sunday of start year; each index is +7 days.
 * Clamps to valid range.
 */
export function getWeekStartByIndex(weekIdx: number): Date {
  const total = getTotalWeeks()
  const clamped = Math.max(0, Math.min(weekIdx, total - 1))
  return addWeeks(FIRST_WEEK_START, clamped)
}

/**
 * Get the week index (0-based) that contains the given date.
 * Returns the index of the week whose Sunday is <= date and Saturday >= date.
 * Clamps to [0, totalWeeks - 1].
 */
export function getWeekIndexForDate(date: Date): number {
  const sun = startOfWeek(date, { weekStartsOn: WEEK_STARTS_ON })
  const days = differenceInDays(sun, FIRST_WEEK_START)
  let idx = Math.floor(days / 7)
  if (idx < 0) return 0
  const total = getTotalWeeks()
  if (idx >= total) return total - 1
  return idx
}

/** Week end (Saturday) for a given week start Sunday */
export function getWeekEnd(weekStart: Date): Date {
  return addDays(weekStart, 6)
}
