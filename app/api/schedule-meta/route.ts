import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { scheduleWeekMeta } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { getCurrentUser } from '@/lib/auth'

const hoursOverrideSchema = z.object({
  sun: z.string().optional(),
  mon: z.string().optional(),
  tue: z.string().optional(),
  wed: z.string().optional(),
  thu: z.string().optional(),
  fri: z.string().optional(),
  sat: z.string().optional(),
})

const dayKeysSchema = z.record(z.string(), z.string()) // { sun: string, mon: string, ... }
const putSchema = z.object({
  storeId: z.number().int(),
  weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  workload: dayKeysSchema.optional(),
  promotions: dayKeysSchema.optional(),
  hoursOverride: hoursOverrideSchema.nullable().optional(),
})

export async function GET(request: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const storeId = parseInt(searchParams.get('storeId') ?? '')
  const weekStart = searchParams.get('weekStart') ?? ''

  if (isNaN(storeId) || !weekStart || !/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) {
    return NextResponse.json({ error: 'Missing or invalid storeId / weekStart' }, { status: 400 })
  }

  if (user.role !== 'ops' && user.storeId !== storeId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const [row] = await db
    .select()
    .from(scheduleWeekMeta)
    .where(and(eq(scheduleWeekMeta.storeId, storeId), eq(scheduleWeekMeta.weekStart, weekStart)))
    .limit(1)

  return NextResponse.json({
    workload: row?.workload ?? null,
    promotions: row?.promotions ?? null,
    hoursOverride: row?.hoursOverride ?? null,
  })
}

export async function PUT(request: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (user.role === 'associate') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const body = await request.json()
    const { storeId, weekStart, workload, promotions, hoursOverride } = putSchema.parse(body)

    if (user.role === 'leader' && user.storeId !== storeId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const [existing] = await db
      .select()
      .from(scheduleWeekMeta)
      .where(and(eq(scheduleWeekMeta.storeId, storeId), eq(scheduleWeekMeta.weekStart, weekStart)))
      .limit(1)

    const baseWorkload = (existing?.workload as Record<string, string> | null) ?? {}
    const basePromotions = (existing?.promotions as Record<string, string> | null) ?? {}
    const nextWorkload = workload !== undefined ? { ...baseWorkload, ...workload } : baseWorkload
    const nextPromotions = promotions !== undefined ? { ...basePromotions, ...promotions } : basePromotions
    const nextHoursOverride = hoursOverride !== undefined ? hoursOverride : (existing?.hoursOverride ?? null)

    await db
      .insert(scheduleWeekMeta)
      .values({
        storeId,
        weekStart,
        workload: nextWorkload,
        promotions: nextPromotions,
        hoursOverride: nextHoursOverride as object | null,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [scheduleWeekMeta.storeId, scheduleWeekMeta.weekStart],
        set: {
          workload: nextWorkload,
          promotions: nextPromotions,
          hoursOverride: nextHoursOverride as object | null,
          updatedAt: new Date(),
        },
      })

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 })
    }
    console.error('Schedule meta PUT error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
