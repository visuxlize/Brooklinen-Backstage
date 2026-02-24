import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { schedules, users, retailData, stores, rtoRequests, scheduleWeekMeta, trafficWeekly, storeTrafficPeak, hourlyTraffic } from '@/lib/db/schema'
import { and, eq, gte, lte, desc } from 'drizzle-orm'
import { ensureRtoRequestDates } from '@/lib/scheduleRtoUtils'
import { getStore, type StoreConfig } from '@/lib/stores'
import { isFullControl } from '@/lib/roles'
import { format, addDays } from 'date-fns'
import { getWeekStartByIndex, getTotalWeeks } from '@/lib/scheduleWeeks'
import { getAllowableHours, getBudgetHoursDaily, getTrendingHoursDaily, findClosestLYWeek } from '@/lib/scheduleHours'

export const dynamic = 'force-dynamic'

/**
 * GET /api/schedule/preview-data?storeId=1&weekIndex=0
 * Returns schedule data for the given store and week so the email template preview can render the grid and capture an image.
 */
export async function GET(request: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const storeIdParam = searchParams.get('storeId')
  const weekIndexParam = searchParams.get('weekIndex')
  if (storeIdParam == null || weekIndexParam == null) {
    return NextResponse.json({ error: 'storeId and weekIndex required' }, { status: 400 })
  }
  const storeId = parseInt(storeIdParam, 10)
  const weekIndex = parseInt(weekIndexParam, 10)
  if (Number.isNaN(storeId) || Number.isNaN(weekIndex)) {
    return NextResponse.json({ error: 'Invalid storeId or weekIndex' }, { status: 400 })
  }

  const totalWeeks = getTotalWeeks()
  if (weekIndex < 0 || weekIndex >= totalWeeks) {
    return NextResponse.json({ error: 'weekIndex out of range' }, { status: 400 })
  }

  if (!isFullControl({ role: user.role, storeId: user.storeId }) && user.storeId !== storeId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const staticStore = getStore(storeId)
  if (!staticStore) return NextResponse.json({ error: 'Store not found' }, { status: 404 })

  const [storeRow] = await db.select().from(stores).where(eq(stores.id, storeId)).limit(1)
  const store: StoreConfig = storeRow
    ? ({ id: storeRow.id, name: storeRow.name, city: storeRow.city, color: storeRow.color, hours: storeRow.hours as Record<string, string> } as StoreConfig)
    : staticStore

  const weekStart = getWeekStartByIndex(weekIndex)
  const weekStartStr = format(weekStart, 'yyyy-MM-dd')

  const storeUsers = await db
    .select({ name: users.name })
    .from(users)
    .where(eq(users.storeId, storeId))

  const rows = await db
    .select()
    .from(schedules)
    .where(and(eq(schedules.storeId, storeId), eq(schedules.weekStart, weekStartStr)))

  const userNames = storeUsers.map((u) => u.name)
  const nameSet = new Set(userNames)
  const firstNameToCanonical: Record<string, string> = {}
  for (const fullName of userNames) {
    const first = fullName.trim().split(/\s+/)[0] ?? fullName
    firstNameToCanonical[first.toLowerCase()] = fullName
  }
  function toCanonical(name: string): string {
    const first = name.trim().split(/\s+/)[0] ?? name
    return firstNameToCanonical[first.toLowerCase()] ?? name
  }

  const initialData: Record<string, Record<number, string>> = {}
  for (const row of rows) {
    const canonical = toCanonical(row.employeeName)
    if (!nameSet.has(canonical)) continue
    if (!initialData[canonical]) initialData[canonical] = {}
    if (initialData[canonical][row.dayOfWeek] == null || initialData[canonical][row.dayOfWeek] === '')
      initialData[canonical][row.dayOfWeek] = row.shiftValue ?? ''
  }
  const employees = [...userNames].sort()

  const approvedRtoRows = await db
    .select({
      id: rtoRequests.id,
      employeeName: rtoRequests.employeeName,
      type: rtoRequests.type,
      status: rtoRequests.status,
      startDate: rtoRequests.startDate,
      endDate: rtoRequests.endDate,
      requestedDays: rtoRequests.requestedDays,
    })
    .from(rtoRequests)
    .where(and(eq(rtoRequests.storeId, storeId), eq(rtoRequests.status, 'approved')))

  const initialApprovedRtoRequests = approvedRtoRows
    .map((r) => ({
      id: r.id,
      employeeName: r.employeeName,
      type: r.type,
      status: r.status,
      startDate: r.startDate != null ? String(r.startDate).slice(0, 10) : null,
      endDate: r.endDate != null ? String(r.endDate).slice(0, 10) : null,
      requestedDays: r.requestedDays,
    }))
    .map(ensureRtoRequestDates)
    .filter((r): r is NonNullable<ReturnType<typeof ensureRtoRequestDates>> => r != null)

  const weekEnd = format(addDays(weekStart, 6), 'yyyy-MM-dd')
  const budgetRows = await db
    .select({ date: retailData.date, budgetNet: retailData.budgetNet, lyNet: retailData.lyNet })
    .from(retailData)
    .where(
      and(
        eq(retailData.storeId, storeId),
        gte(retailData.date, weekStartStr),
        lte(retailData.date, weekEnd)
      )
    )
  const dailyBudget = [0, 0, 0, 0, 0, 0, 0]
  const dailyLy = [0, 0, 0, 0, 0, 0, 0]
  let weeklyBudget = 0
  let weeklyLy = 0
  const [sy, sm, sd] = weekStartStr.split('-').map(Number)
  const weekStartMs = new Date(sy, sm - 1, sd).getTime()
  for (const row of budgetRows) {
    const dateStr = typeof row.date === 'string' ? row.date : (row.date as Date).toISOString().slice(0, 10)
    const [ry, rm, rd] = dateStr.split('-').map(Number)
    const dayIdx = Math.round((new Date(ry, rm - 1, rd).getTime() - weekStartMs) / (24 * 60 * 60 * 1000))
    if (dayIdx >= 0 && dayIdx <= 6) {
      const b = row.budgetNet != null ? Number(row.budgetNet) : 0
      const ly = row.lyNet != null ? Number(row.lyNet) : 0
      dailyBudget[dayIdx] = b
      dailyLy[dayIdx] = ly
      weeklyBudget += b
      weeklyLy += ly
    }
  }

  const [metaRow] = await db
    .select()
    .from(scheduleWeekMeta)
    .where(and(eq(scheduleWeekMeta.storeId, storeId), eq(scheduleWeekMeta.weekStart, weekStartStr)))
    .limit(1)
  const workload = metaRow?.workload != null && typeof metaRow.workload === 'object' ? (metaRow.workload as Record<string, string>) : null
  const promotions = metaRow?.promotions != null && typeof metaRow.promotions === 'object' ? (metaRow.promotions as Record<string, string>) : null
  const hoursOverride = metaRow?.hoursOverride != null && typeof metaRow.hoursOverride === 'object' ? (metaRow.hoursOverride as Record<string, string>) : null

  const allowableHours = getAllowableHours(weeklyBudget)
  const budgetHoursDaily = getBudgetHoursDaily(allowableHours)
  const trafficWeeks = await db
    .select()
    .from(trafficWeekly)
    .where(eq(trafficWeekly.storeId, storeId))
    .orderBy(desc(trafficWeekly.weekStart))
    .limit(53)
  const latestTraffic = trafficWeeks[0]
  const trendMult = latestTraffic?.trendMult != null ? Number(latestTraffic.trendMult) : 0
  const trafficByWeek: Record<string, number[]> = {}
  for (const w of trafficWeeks) {
    const ws = typeof w.weekStart === 'string' ? w.weekStart : (w.weekStart as Date).toISOString().slice(0, 10)
    trafficByWeek[ws] = [
      Number(w.sun ?? 0),
      Number(w.mon ?? 0),
      Number(w.tue ?? 0),
      Number(w.wed ?? 0),
      Number(w.thu ?? 0),
      Number(w.fri ?? 0),
      Number(w.sat ?? 0),
    ]
  }
  const availableWeeks = Object.keys(trafficByWeek).sort()
  const lyWeekKey = findClosestLYWeek(weekStartStr, availableWeeks)
  const lyTraffic = lyWeekKey ? trafficByWeek[lyWeekKey] : null
  const trendingHoursDaily = getTrendingHoursDaily(
    allowableHours,
    lyTraffic ?? [0, 0, 0, 0, 0, 0, 0],
    trendMult
  )
  let peakWindowByDay: string[] = ['—', '—', '—', '—', '—', '—', '—']
  const [storedPeakRow] = await db
    .select({ peakWindowByDay: storeTrafficPeak.peakWindowByDay })
    .from(storeTrafficPeak)
    .where(eq(storeTrafficPeak.storeId, storeId))
    .limit(1)
  const storedPeak = storedPeakRow?.peakWindowByDay
  if (Array.isArray(storedPeak) && storedPeak.length === 7 && storedPeak.every((x) => typeof x === 'string')) {
    peakWindowByDay = storedPeak as string[]
  } else {
    const hourlyRows = await db
      .select({ hour: hourlyTraffic.hour, dayOfWeek: hourlyTraffic.dayOfWeek, avgCount: hourlyTraffic.avgCount })
      .from(hourlyTraffic)
      .where(eq(hourlyTraffic.storeId, storeId))
    for (let dow = 0; dow < 7; dow++) {
      const byHour = hourlyRows
        .filter((r) => r.dayOfWeek === dow)
        .map((r) => ({ hour: r.hour, avg: Number(r.avgCount ?? 0) }))
        .sort((a, b) => b.avg - a.avg)
      const top3 = byHour.slice(0, 3).map((x) => x.hour).sort((a, b) => a - b)
      if (top3.length >= 2) {
        const fmt = (h: number) => {
          if (h === 0) return '12AM'
          if (h < 12) return `${h}AM`
          if (h === 12) return '12PM'
          return `${h - 12}PM`
        }
        const endH = Math.min((top3[top3.length - 1] ?? 20) + 1, 20)
        peakWindowByDay[dow] = `${fmt(top3[0])} – ${fmt(endH)}`
      }
    }
  }

  return NextResponse.json({
    store: { id: store.id, name: store.name, city: store.city, color: store.color, hours: store.hours },
    employees,
    initialData,
    weekStart: weekStartStr,
    weekStartDate: weekStart.toISOString(),
    initialWeekIdx: weekIndex,
    totalWeeks,
    initialApprovedRtoRequests,
    initialDailyBudget: dailyBudget,
    initialDailyLy: dailyLy,
    initialWeeklyBudget: weeklyBudget || null,
    initialWeeklyLy: weeklyLy || null,
    initialWeekMeta: workload || promotions || hoursOverride ? { workload, promotions, hoursOverride } : null,
    budgetHoursDaily,
    trendingHoursDaily,
    peakWindowByDay,
    allowableHours,
  })
}
