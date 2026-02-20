import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { schedules } from '@/lib/db/schema'
import { and, eq } from 'drizzle-orm'
import { getCurrentUser } from '@/lib/auth'
import { sql } from 'drizzle-orm'

const postSchema = z.object({
  storeId: z.number().int(),
  employeeName: z.string().min(1),
  weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dayOfWeek: z.number().int().min(0).max(6),
  shiftValue: z.string().optional(),
})

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
  if (user.role !== 'ops' && user.storeId !== storeId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const data = await db
    .select()
    .from(schedules)
    .where(and(eq(schedules.storeId, storeId), eq(schedules.weekStart, weekStart)))

  return NextResponse.json({ data })
}

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (user.role === 'associate') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const body = await request.json()
    const validated = postSchema.parse(body)

    if (user.role === 'leader' && user.storeId !== validated.storeId) {
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
