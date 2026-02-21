import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { schedules, trafficWeekly } from '@/lib/db/schema'
import { and, eq } from 'drizzle-orm'
import { getCurrentUser } from '@/lib/auth'
import { sql } from 'drizzle-orm'
import { getStore } from '@/lib/stores'

const bodySchema = z.object({
  storeId: z.number().int(),
  weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  maxHoursPerPerson: z.number().min(1).max(60).optional(),
})

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (user.role === 'associate') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const body = await request.json()
    const validated = bodySchema.parse(body)

    if (user.role === 'leader' && user.storeId !== validated.storeId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const store = getStore(validated.storeId)
    if (!store) return NextResponse.json({ error: 'Store not found' }, { status: 404 })

    const maxHours = validated.maxHoursPerPerson ?? 40
    const hours = store.hours as Record<string, string>
    const dayKeys = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const
    const defaultShiftByDay = dayKeys.map((k) => hours[k] ?? '11AM–7PM')

    const existing = await db
      .select()
      .from(schedules)
      .where(and(eq(schedules.storeId, validated.storeId), eq(schedules.weekStart, validated.weekStart)))

    const employeeSet = new Set(existing.map((r) => r.employeeName))
    const employees = Array.from(employeeSet)
    if (employees.length === 0) {
      return NextResponse.json({ error: 'No employees on this schedule yet. Add at least one shift or team member first.' }, { status: 400 })
    }

    const [trafficRow] = await db
      .select()
      .from(trafficWeekly)
      .where(and(eq(trafficWeekly.storeId, validated.storeId), eq(trafficWeekly.weekStart, validated.weekStart)))
      .limit(1)

    const dayWeights = trafficRow
      ? [trafficRow.sun ?? 0, trafficRow.mon ?? 0, trafficRow.tue ?? 0, trafficRow.wed ?? 0, trafficRow.thu ?? 0, trafficRow.fri ?? 0, trafficRow.sat ?? 0]
      : [1, 1, 1, 1, 1, 1, 1]
    const totalWeight = dayWeights.reduce((a, b) => a + b, 0) || 1

    const hrsPerShift = 8
    const shiftsPerWeek = Math.floor(maxHours / hrsPerShift)
    const totalShiftsNeeded = employees.length * shiftsPerWeek
    const shiftsPerDay: number[] = dayWeights.map((w) =>
      Math.max(0, Math.round((totalShiftsNeeded * w) / totalWeight))
    )

    const assignments: { employeeName: string; dayOfWeek: number; shiftValue: string }[] = []
    const shiftsUsed: Record<string, number> = {}
    employees.forEach((e) => { shiftsUsed[e] = 0 })

    for (let day = 0; day < 7; day++) {
      const needed = Math.min(shiftsPerDay[day] ?? 1, employees.length)
      const shiftVal = defaultShiftByDay[day]
      const sorted = [...employees].sort((a, b) => (shiftsUsed[a] ?? 0) - (shiftsUsed[b] ?? 0))
      for (let i = 0; i < needed && i < sorted.length; i++) {
        const emp = sorted[i]
        if ((shiftsUsed[emp] ?? 0) >= shiftsPerWeek) continue
        assignments.push({ employeeName: emp, dayOfWeek: day, shiftValue: shiftVal })
        shiftsUsed[emp] = (shiftsUsed[emp] ?? 0) + 1
      }
    }

    for (const a of assignments) {
      await db
        .insert(schedules)
        .values({
          storeId: validated.storeId,
          employeeName: a.employeeName,
          weekStart: validated.weekStart,
          dayOfWeek: a.dayOfWeek,
          shiftValue: a.shiftValue,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [schedules.storeId, schedules.employeeName, schedules.weekStart, schedules.dayOfWeek],
          set: {
            shiftValue: sql`excluded.shift_value`,
            updatedAt: new Date(),
          },
        })
    }

    return NextResponse.json({ success: true, updated: assignments.length })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: err.errors }, { status: 400 })
    }
    console.error('Schedule predict error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
