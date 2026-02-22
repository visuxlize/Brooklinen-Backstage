import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { schedules } from '@/lib/db/schema'
import { and, eq } from 'drizzle-orm'
import { getCurrentUser } from '@/lib/auth'
import { normalizeRole, isStoreLeader } from '@/lib/roles'
import { sql } from 'drizzle-orm'

const bodySchema = z.object({
  storeId: z.number().int(),
  weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  sourceEmployeeName: z.string().min(1),
  sourceDayOfWeek: z.number().int().min(0).max(6),
  targetEmployeeName: z.string().min(1),
  targetDayOfWeek: z.number().int().min(0).max(6),
})

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (normalizeRole(user.role) === 'lead' || normalizeRole(user.role) === 'associate') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const validated = bodySchema.parse(body)

    if (isStoreLeader(user) && user.storeId !== validated.storeId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const [sourceRow] = await db
      .select()
      .from(schedules)
      .where(
        and(
          eq(schedules.storeId, validated.storeId),
          eq(schedules.weekStart, validated.weekStart),
          eq(schedules.employeeName, validated.sourceEmployeeName),
          eq(schedules.dayOfWeek, validated.sourceDayOfWeek)
        )
      )
      .limit(1)

    const shiftValue = sourceRow?.shiftValue ?? null

    await db
      .insert(schedules)
      .values({
        storeId: validated.storeId,
        employeeName: validated.targetEmployeeName,
        weekStart: validated.weekStart,
        dayOfWeek: validated.targetDayOfWeek,
        shiftValue,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [schedules.storeId, schedules.employeeName, schedules.weekStart, schedules.dayOfWeek],
        set: {
          shiftValue: sql`excluded.shift_value`,
          updatedAt: new Date(),
        },
      })

    return NextResponse.json({ success: true, shiftValue })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: err.errors }, { status: 400 })
    }
    console.error('Schedule copy error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
