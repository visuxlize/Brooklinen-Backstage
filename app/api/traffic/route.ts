import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { trafficWeekly, hourlyTraffic } from '@/lib/db/schema'
import { and, eq, desc } from 'drizzle-orm'
import { getCurrentUser } from '@/lib/auth'
import { normalizeRole, isFullControl, isStoreLeader } from '@/lib/roles'
import { sql } from 'drizzle-orm'

const postSchema = z.object({
  storeId: z.number().int(),
  weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  sun: z.number().default(0),
  mon: z.number().default(0),
  tue: z.number().default(0),
  wed: z.number().default(0),
  thu: z.number().default(0),
  fri: z.number().default(0),
  sat: z.number().default(0),
  total: z.number().default(0),
  trendMult: z.string().optional(),
  trafficCount: z.number().optional(),
})

const weekSchema = postSchema.omit({ storeId: true })
const bulkPostSchema = z.object({
  storeId: z.number().int(),
  weeks: z.array(weekSchema),
})

export async function GET(request: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (normalizeRole(user.role) === 'lead' || normalizeRole(user.role) === 'associate') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const storeId = parseInt(searchParams.get('storeId') ?? '')

  if (isNaN(storeId)) {
    return NextResponse.json({ error: 'Missing storeId' }, { status: 400 })
  }

  if (!isFullControl(user) && user.storeId !== storeId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const weekly = await db
    .select()
    .from(trafficWeekly)
    .where(eq(trafficWeekly.storeId, storeId))
    .orderBy(desc(trafficWeekly.weekStart))
    .limit(53)

  const hourly = await db
    .select()
    .from(hourlyTraffic)
    .where(eq(hourlyTraffic.storeId, storeId))
    .orderBy(hourlyTraffic.dayOfWeek, hourlyTraffic.hour)

  return NextResponse.json({ weekly, hourly })
}

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (normalizeRole(user.role) === 'lead' || normalizeRole(user.role) === 'associate') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const body = await request.json()

    // Bulk upload: { storeId, weeks: [{ weekStart, sun, mon, ... }] }
    if (Array.isArray(body.weeks) && body.storeId != null) {
      const bulk = bulkPostSchema.parse(body)
      if (isStoreLeader(user) && user.storeId !== bulk.storeId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      for (const w of bulk.weeks) {
        const total = w.total ?? w.sun + w.mon + w.tue + w.wed + w.thu + w.fri + w.sat
        await db
          .insert(trafficWeekly)
          .values({
            storeId: bulk.storeId,
            weekStart: w.weekStart,
            sun: w.sun,
            mon: w.mon,
            tue: w.tue,
            wed: w.wed,
            thu: w.thu,
            fri: w.fri,
            sat: w.sat,
            total,
            trendMult: w.trendMult,
            trafficCount: w.trafficCount,
          })
          .onConflictDoUpdate({
            target: [trafficWeekly.storeId, trafficWeekly.weekStart],
            set: {
              sun: sql`excluded.sun`,
              mon: sql`excluded.mon`,
              tue: sql`excluded.tue`,
              wed: sql`excluded.wed`,
              thu: sql`excluded.thu`,
              fri: sql`excluded.fri`,
              sat: sql`excluded.sat`,
              total: sql`excluded.total`,
              trendMult: sql`excluded.trend_mult`,
              trafficCount: sql`excluded.traffic_count`,
            },
          })
      }
      return NextResponse.json({ success: true, applied: bulk.weeks.length })
    }

    const validated = postSchema.parse(body)
    if (isStoreLeader(user) && user.storeId !== validated.storeId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await db
      .insert(trafficWeekly)
      .values({
        storeId: validated.storeId,
        weekStart: validated.weekStart,
        sun: validated.sun,
        mon: validated.mon,
        tue: validated.tue,
        wed: validated.wed,
        thu: validated.thu,
        fri: validated.fri,
        sat: validated.sat,
        total: validated.total,
        trendMult: validated.trendMult,
        trafficCount: validated.trafficCount,
      })
      .onConflictDoUpdate({
        target: [trafficWeekly.storeId, trafficWeekly.weekStart],
        set: {
          sun: sql`excluded.sun`,
          mon: sql`excluded.mon`,
          tue: sql`excluded.tue`,
          wed: sql`excluded.wed`,
          thu: sql`excluded.thu`,
          fri: sql`excluded.fri`,
          sat: sql`excluded.sat`,
          total: sql`excluded.total`,
          trendMult: sql`excluded.trend_mult`,
          trafficCount: sql`excluded.traffic_count`,
        },
      })

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 })
    }
    console.error('Traffic POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
