import { db } from '@/lib/db'
import { availability, users, schedules } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { format, startOfWeek, getDay } from 'date-fns'

const MONTHS: Record<string, number> = {
  jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2, apr: 3, april: 3,
  may: 4, jun: 5, june: 5, jul: 6, july: 6, aug: 7, august: 7, sep: 8, sept: 8, september: 8,
  oct: 9, october: 9, nov: 10, november: 10, dec: 11, december: 11,
}

function parseMonth(s: string): number | undefined {
  const lower = s.toLowerCase().trim()
  return MONTHS[lower] ?? MONTHS[lower.slice(0, 3)]
}

/**
 * Parse one segment like "March 8 - 14th", "March 8 - March 15", "March 1", or "March 6-8"
 * into an array of Date objects (inclusive range).
 */
function parseOneSegment(
  segment: string,
  referenceYear: number
): Date[] {
  const raw = segment.trim().replace(/\b(st|nd|rd|th)\b/gi, '').trim() // strip ordinals
  if (!raw) return []

  // 1) "Month Day - Month Day" (e.g. March 8 - March 15, March 8 – April 2)
  const twoDateMatch = raw.match(/^([a-zA-Z]+)\s+(\d+)\s*[-–—to]+\s*([a-zA-Z]+)\s+(\d+)/i)
  if (twoDateMatch) {
    const month1 = parseMonth(twoDateMatch[1])
    const month2 = parseMonth(twoDateMatch[3])
    if (month1 !== undefined && month2 !== undefined) {
      let d1 = new Date(referenceYear, month1, parseInt(twoDateMatch[2], 10))
      let d2 = new Date(referenceYear, month2, parseInt(twoDateMatch[4], 10))
      if (d2 < d1) d2 = new Date(referenceYear + 1, month2, parseInt(twoDateMatch[4], 10))
      if (!Number.isNaN(d1.getTime()) && !Number.isNaN(d2.getTime()) && d1 <= d2) {
        const dates: Date[] = []
        for (let d = new Date(d1); d <= d2; d.setDate(d.getDate() + 1)) dates.push(new Date(d))
        return dates
      }
    }
  }

  // 2) "Month Day - Day" same month (e.g. March 8 - 14, March 8 - 14th, March 6-8)
  const rangeMatch = raw.match(/^([a-zA-Z]+)\s+(\d+)\s*[-–—to]+\s*(\d+)/i)
  if (rangeMatch) {
    const month = parseMonth(rangeMatch[1])
    if (month !== undefined) {
      const day1 = parseInt(rangeMatch[2], 10)
      const day2 = parseInt(rangeMatch[3], 10)
      const d1 = new Date(referenceYear, month, day1)
      const d2 = new Date(referenceYear, month, day2)
      if (!Number.isNaN(d1.getTime()) && !Number.isNaN(d2.getTime()) && d1 <= d2) {
        const dates: Date[] = []
        for (let d = new Date(d1); d <= d2; d.setDate(d.getDate() + 1)) dates.push(new Date(d))
        return dates
      }
    }
  }

  // 3) Single day: "March 1", "March 1st", "Mar 1"
  const singleMatch = raw.match(/^([a-zA-Z]+)\s+(\d+)/i)
  if (singleMatch) {
    const month = parseMonth(singleMatch[1])
    if (month !== undefined) {
      const d = new Date(referenceYear, month, parseInt(singleMatch[2], 10))
      if (!Number.isNaN(d.getTime())) return [d]
    }
  }

  return []
}

/**
 * Parse requested days text into date strings and week info.
 * Handles: "March 8 - 14th", "March 8 - March 15", "March 1", "March 6-8", and comma-separated (e.g. "March 1, March 6-8").
 * Uses current year when year is not given.
 */
export function parseRequestedDays(
  requestedDays: string,
  referenceYear: number = new Date().getFullYear()
): { dateStr: string; weekStart: string; dayOfWeek: number }[] {
  const raw = requestedDays.trim()
  if (!raw) return []

  // Split on comma or " and " to support multiple ranges
  const segments = raw.split(/\s*,\s*|\s+and\s+/i).map((s) => s.trim()).filter(Boolean)
  const dateSet = new Set<string>()
  const dates: Date[] = []

  for (const segment of segments) {
    const part = parseOneSegment(segment, referenceYear)
    for (const d of part) {
      const key = format(d, 'yyyy-MM-dd')
      if (!dateSet.has(key)) {
        dateSet.add(key)
        dates.push(d)
      }
    }
  }

  dates.sort((a, b) => a.getTime() - b.getTime())

  return dates.map((d) => ({
    dateStr: format(d, 'yyyy-MM-dd'),
    weekStart: format(startOfWeek(d, { weekStartsOn: 0 }), 'yyyy-MM-dd'),
    dayOfWeek: getDay(d),
  }))
}

/**
 * Build date infos from a start/end date period (inclusive). Used when request has startDate/endDate.
 */
export function dateRangeToDateInfos(
  startDate: string,
  endDate: string
): { dateStr: string; weekStart: string; dayOfWeek: number }[] {
  const start = new Date(startDate)
  const end = new Date(endDate)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) return []
  const out: { dateStr: string; weekStart: string; dayOfWeek: number }[] = []
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const date = new Date(d)
    out.push({
      dateStr: format(date, 'yyyy-MM-dd'),
      weekStart: format(startOfWeek(date, { weekStartsOn: 0 }), 'yyyy-MM-dd'),
      dayOfWeek: getDay(date),
    })
  }
  return out
}

/**
 * When an RTO request is approved: update availability and schedule so the schedule reflects it.
 * - RTO → availability OFF (na), schedule cell OFF
 * - PTO → availability OFF (na), schedule cell PTO
 * - Partial → availability partial (start/end from partialTime), no schedule cell (scheduler fills within window)
 */
export async function applyRtoApprovalToAvailabilityAndSchedule(
  request: {
    storeId: number
    employeeName: string
    employeeEmail: string
    requestedDays: string
    type: string
    partialTime: string | null
    startDate?: string | null
    endDate?: string | null
  }
): Promise<void> {
  const [dbUser] = await db
    .select()
    .from(users)
    .where(
      and(
        eq(users.storeId, request.storeId),
        eq(users.email, request.employeeEmail)
      )
    )
    .limit(1)

  if (!dbUser) return // no user in system for this email/store; skip sync

  const dateInfos =
    request.startDate && request.endDate
      ? dateRangeToDateInfos(request.startDate, request.endDate)
      : parseRequestedDays(request.requestedDays)
  if (dateInfos.length === 0) return

  const type = request.type.toUpperCase()
  const isPartial = type === 'PARTIAL'
  const isPTO = type === 'PTO'
  const isRTO = type === 'RTO' || !isPartial && !isPTO

  // Parse partial time "10:00 AM – 2:00 PM" into 24h for availability (e.g. "10:00", "14:00")
  let partialStart: string | undefined
  let partialEnd: string | undefined
  if (isPartial && request.partialTime) {
    const parts = request.partialTime.split(/\s*[-–—]\s*/).map((s) => s.trim())
    if (parts.length >= 2) {
      partialStart = normalizeTimeTo24(parts[0])
      partialEnd = normalizeTimeTo24(parts[1])
    }
  }

  const weekKeys = new Map<string, { weekStart: string; days: Map<number, { type: 'na' | 'partial'; start?: string; end?: string }> }>()

  for (const { weekStart, dayOfWeek } of dateInfos) {
    if (!weekKeys.has(weekStart)) {
      weekKeys.set(weekStart, { weekStart, days: new Map() })
    }
    const entry = weekKeys.get(weekStart)!
    if (isPartial && partialStart && partialEnd) {
      entry.days.set(dayOfWeek, { type: 'partial', start: partialStart, end: partialEnd })
    } else {
      entry.days.set(dayOfWeek, { type: 'na' })
    }
  }

  // Fetch existing week-scope availability for this user/store for the affected weeks
  const weekStarts = [...weekKeys.keys()]
  const existingRows = weekStarts.length
    ? await db
        .select({ effectiveDate: availability.effectiveDate, daySchedule: availability.daySchedule })
        .from(availability)
        .where(
          and(
            eq(availability.storeId, request.storeId),
            eq(availability.userId, dbUser.id),
            eq(availability.scope, 'week')
          )
        )
    : []
  const existingByWeek = new Map(existingRows.map((r) => [String(r.effectiveDate), r.daySchedule as Record<string, { type: string; start?: string; end?: string }> | null]))

  for (const { weekStart, days } of weekKeys.values()) {
    const daySchedule: Record<string, { type: string; start?: string; end?: string }> = {}
    for (let d = 0; d < 7; d++) {
      const slot = days.get(d)
      if (slot) {
        daySchedule[String(d)] = slot.start != null
          ? { type: 'partial', start: slot.start, end: slot.end! }
          : { type: 'na' }
      }
    }
    const existing = existingByWeek.get(weekStart) ?? null
    const merged = mergeDaySchedule(existing, daySchedule)

    await db
      .insert(availability)
      .values({
        storeId: request.storeId,
        userId: dbUser.id,
        effectiveDate: weekStart,
        scope: 'week',
        type: 'open',
        daySchedule: merged as Record<string, { type: string; start?: string; end?: string }>,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [availability.storeId, availability.userId, availability.effectiveDate, availability.scope],
        set: {
          daySchedule: merged as Record<string, { type: string; start?: string; end?: string }>,
          updatedAt: new Date(),
        },
      })
  }

  // Schedule: set OFF for RTO, PTO for PTO (Partial has no default shift, just availability)
  const scheduleValue = isPTO ? 'PTO' : isRTO ? 'OFF' : null
  if (scheduleValue) {
    for (const { weekStart, dayOfWeek } of dateInfos) {
      await db
        .insert(schedules)
        .values({
          storeId: request.storeId,
          employeeName: request.employeeName,
          weekStart,
          dayOfWeek,
          shiftValue: scheduleValue,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [schedules.storeId, schedules.employeeName, schedules.weekStart, schedules.dayOfWeek],
          set: { shiftValue: scheduleValue, updatedAt: new Date() },
        })
    }
  }
}

/** Request shape for revert (same as apply, plus optional id for logging). */
type RtoRequestForRevert = {
  storeId: number
  employeeName: string
  employeeEmail: string
  requestedDays: string
  startDate?: string | null
  endDate?: string | null
}

/**
 * When a leader undoes an approved request (or deletes it): clear OFF/PTO/partial from schedule
 * and set those days back to open so they can be scheduled again.
 */
export async function revertRtoFromSchedule(request: RtoRequestForRevert): Promise<void> {
  const dateInfos =
    request.startDate && request.endDate
      ? dateRangeToDateInfos(request.startDate, request.endDate)
      : parseRequestedDays(request.requestedDays)
  if (dateInfos.length === 0) return

  for (const { weekStart, dayOfWeek } of dateInfos) {
    await db
      .delete(schedules)
      .where(
        and(
          eq(schedules.storeId, request.storeId),
          eq(schedules.employeeName, request.employeeName),
          eq(schedules.weekStart, weekStart),
          eq(schedules.dayOfWeek, dayOfWeek)
        )
      )
  }

  const [dbUser] = await db
    .select()
    .from(users)
    .where(
      and(
        eq(users.storeId, request.storeId),
        eq(users.email, request.employeeEmail)
      )
    )
    .limit(1)
  if (!dbUser) return

  const weekStarts = [...new Set(dateInfos.map((d) => d.weekStart))]
  const existingRows = await db
    .select({ effectiveDate: availability.effectiveDate, daySchedule: availability.daySchedule })
    .from(availability)
    .where(
      and(
        eq(availability.storeId, request.storeId),
        eq(availability.userId, dbUser.id),
        eq(availability.scope, 'week')
      )
    )
  const existingByWeek = new Map(
    existingRows.map((r) => [String(r.effectiveDate), r.daySchedule as Record<string, { type: string; start?: string; end?: string }> | null])
  )

  for (const weekStart of weekStarts) {
    const existing = existingByWeek.get(weekStart) ?? null
    const toOpen = new Set(dateInfos.filter((d) => d.weekStart === weekStart).map((d) => d.dayOfWeek))
    const merged: Record<string, { type: string; start?: string; end?: string }> = {}
    for (let d = 0; d < 7; d++) {
      const key = String(d)
      merged[key] = toOpen.has(d) ? { type: 'open' } : (existing?.[key] ?? { type: 'open' })
    }
    await db
      .insert(availability)
      .values({
        storeId: request.storeId,
        userId: dbUser.id,
        effectiveDate: weekStart,
        scope: 'week',
        type: 'open',
        daySchedule: merged as Record<string, { type: string; start?: string; end?: string }>,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [availability.storeId, availability.userId, availability.effectiveDate, availability.scope],
        set: {
          daySchedule: merged as Record<string, { type: string; start?: string; end?: string }>,
          updatedAt: new Date(),
        },
      })
  }
}

function mergeDaySchedule(
  existing: Record<string, { type: string; start?: string; end?: string }> | null,
  override: Record<string, { type: string; start?: string; end?: string }>
): Record<string, { type: string; start?: string; end?: string }> {
  const base: Record<string, { type: string; start?: string; end?: string }> = {}
  for (let d = 0; d < 7; d++) {
    const key = String(d)
    const ex = existing?.[key]
    const ov = override[key]
    if (ov) base[key] = ov
    else if (ex) base[key] = ex
  }
  return base
}

function normalizeTimeTo24(t: string): string {
  const lower = t.toLowerCase().trim()
  const match = lower.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/)
  if (!match) return t
  let h = parseInt(match[1], 10)
  const m = match[2] != null ? parseInt(match[2], 10) : 0
  const ampm = match[3]
  if (ampm === 'pm' && h !== 12) h += 12
  if (ampm === 'am' && h === 12) h = 0
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}
