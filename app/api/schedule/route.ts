import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { schedules, retailData, trafficWeekly, hourlyTraffic, scheduleWeekMeta } from '@/lib/db/schema'
import { and, eq, gte, lte, desc } from 'drizzle-orm'
import { getCurrentUser } from '@/lib/auth'
import { normalizeRole, isStoreLeader, isFullControl } from '@/lib/roles'
import { sql } from 'drizzle-orm'
import {
  getAllowableHours,
  getBudgetHoursDaily,
  getTrendingHoursDaily,
  findClosestLYWeek,
} from '@/lib/scheduleHours'

const postSchema = z.object({
  storeId: z.number().int(),
  employeeName: z.string().min(1),
  weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dayOfWeek: z.number().int().min(0).max(6),
  shiftValue: z.string().optional(),
})

export async function DELETE(request: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const role = normalizeRole(user.role)
  if (role === 'lead' || role === 'associate') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const storeId = parseInt(searchParams.get('storeId') ?? '')
  const weekStart = searchParams.get('weekStart') ?? ''

  if (isNaN(storeId) || !weekStart || !/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) {
    return NextResponse.json({ error: 'Missing or invalid storeId / weekStart' }, { status: 400 })
  }

  if (isStoreLeader(user) && user.storeId !== storeId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await db
    .delete(schedules)
    .where(and(eq(schedules.storeId, storeId), eq(schedules.weekStart, weekStart)))

  return NextResponse.json({ success: true })
}

export async function GET(request: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const storeId = parseInt(searchParams.get('storeId') ?? '')
  const weekStart = searchParams.get('weekStart') ?? ''

  if (isNaN(storeId) || !weekStart) {
    return NextResponse.json({ error: 'Missing storeId or weekStart' }, { status: 400 })
  }

  // Enforce role-based access
  if (!isFullControl(user) && user.storeId !== storeId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const data = await db
    .select()
    .from(schedules)
    .where(and(eq(schedules.storeId, storeId), eq(schedules.weekStart, weekStart)))

  const [y, m, d] = weekStart.split('-').map(Number)
  const endDate = new Date(y, m - 1, d + 6)
  const weekEnd = endDate.toISOString().slice(0, 10)

  const budgetRows = await db
    .select({
      date: retailData.date,
      budgetNet: retailData.budgetNet,
      lyNet: retailData.lyNet,
    })
    .from(retailData)
    .where(
      and(
        eq(retailData.storeId, storeId),
        gte(retailData.date, weekStart),
        lte(retailData.date, weekEnd)
      )
    )

  const dailyBudget: number[] = [0, 0, 0, 0, 0, 0, 0]
  const dailyLy: number[] = [0, 0, 0, 0, 0, 0, 0]
  let weeklyBudget = 0
  let weeklyLy = 0

  const [sy, sm, sd] = weekStart.split('-').map(Number)
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

  // Budget hours & trending hours (allowable from weekly sales; trending from traffic)
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
  const lyWeekKey = findClosestLYWeek(weekStart, availableWeeks)
  const lyTraffic = lyWeekKey ? trafficByWeek[lyWeekKey] : null
  const trendingHoursDaily = getTrendingHoursDaily(
    allowableHours,
    lyTraffic ?? [0, 0, 0, 0, 0, 0, 0],
    trendMult
  )

  // Peak window per day from hourly traffic (busiest 3-hour window)
  const hourlyRows = await db
    .select({ hour: hourlyTraffic.hour, dayOfWeek: hourlyTraffic.dayOfWeek, avgCount: hourlyTraffic.avgCount })
    .from(hourlyTraffic)
    .where(eq(hourlyTraffic.storeId, storeId))
  const peakWindowByDay: string[] = ['—', '—', '—', '—', '—', '—', '—']
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

  const [weekMetaRow] = await db
    .select()
    .from(scheduleWeekMeta)
    .where(and(eq(scheduleWeekMeta.storeId, storeId), eq(scheduleWeekMeta.weekStart, weekStart)))
    .limit(1)

  const weekMeta = {
    workload: weekMetaRow?.workload ?? null,
    promotions: weekMetaRow?.promotions ?? null,
    hoursOverride: weekMetaRow?.hoursOverride ?? null,
  }

  return NextResponse.json({
    data,
    weeklyBudget,
    weeklyLy,
    dailyBudget,
    dailyLy,
    allowableHours,
    budgetHoursDaily,
    trendingHoursDaily,
    peakWindowByDay,
    weekMeta,
  })
}

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (normalizeRole(user.role) === 'lead' || normalizeRole(user.role) === 'associate') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const validated = postSchema.parse(body)

    if (isStoreLeader(user) && user.storeId !== validated.storeId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Upsert on (storeId, employeeName, weekStart, dayOfWeek)
    await db
      .insert(schedules)
      .values({
        storeId: validated.storeId,
        employeeName: validated.employeeName,
        weekStart: validated.weekStart,
        dayOfWeek: validated.dayOfWeek,
        shiftValue: validated.shiftValue ?? null,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [schedules.storeId, schedules.employeeName, schedules.weekStart, schedules.dayOfWeek],
        set: {
          shiftValue: sql`excluded.shift_value`,
          updatedAt: new Date(),
        },
      })

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 })
    }
    console.error('Schedule POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
