import { db } from '@/lib/db'
import { availability, users, schedules } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { format, startOfWeek, getDay } from 'date-fns'

const MONTHS: Record<string, number> = {
  jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2, apr: 3, april: 3,
  may: 4, jun: 5, june: 5, jul: 6, july: 6, aug: 7, august: 7, sep: 8, sept: 8, september: 8,
  oct: 9, october: 9, nov: 10, november: 10, dec: 11, december: 11,
}

/**
 * Parse "Mar 15" or "Mar 22-23" / "Mar 22–23" into date strings (YYYY-MM-DD) and week info.
 * Uses current year when year is not given.
 */
export function parseRequestedDays(
  requestedDays: string,
  referenceYear: number = new Date().getFullYear()
): { dateStr: string; weekStart: string; dayOfWeek: number }[] {
  const out: { dateStr: string; weekStart: string; dayOfWeek: number }[] = []
  const raw = requestedDays.trim()
  if (!raw) return out

  // Match month (abbrev or full) and day(s): "Mar 15", "March 22-23", "Mar 22 – 23"
  const monthMatch = raw.match(/^([a-zA-Z]+)\s+(\d+)(?:\s*[-–—to]+\s*(\d+))?/i)
  if (!monthMatch) return out

  const monthStr = monthMatch[1].toLowerCase()
  const month = MONTHS[monthStr] ?? MONTHS[monthStr.slice(0, 3)]
  if (month === undefined) return out

  const day1 = parseInt(monthMatch[2], 10)
  const day2 = monthMatch[3] != null ? parseInt(monthMatch[3], 10) : null

  const dates: Date[] = []
  const d1 = new Date(referenceYear, month, day1)
  if (!Number.isNaN(d1.getTime())) dates.push(d1)
  if (day2 != null && !Number.isNaN(day2)) {
    const d2 = new Date(referenceYear, month, day2)
    if (!Number.isNaN(d2.getTime())) {
      for (let d = new Date(d1); d <= d2; d.setDate(d.getDate() + 1)) {
        dates.push(new Date(d))
      }
    }
  }

  for (const d of dates) {
    const dateStr = format(d, 'yyyy-MM-dd')
    const weekStart = format(startOfWeek(d, { weekStartsOn: 0 }), 'yyyy-MM-dd')
    const dayOfWeek = getDay(d) // 0 Sun .. 6 Sat
    out.push({ dateStr, weekStart, dayOfWeek })
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

  const dateInfos = parseRequestedDays(request.requestedDays)
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
