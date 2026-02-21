import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { availability, users } from '@/lib/db/schema'
import { eq, desc } from 'drizzle-orm'
import { getCurrentUser } from '@/lib/auth'

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T12:00:00')
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

const partialHoursSchema = z.record(
  z.string(),
  z.tuple([z.string(), z.string()]).nullable()
).nullable()

const daySlotSchema = z.object({
  type: z.enum(['na', 'open', 'partial']),
  start: z.string().optional(),
  end: z.string().optional(),
})

const dayScheduleSchema = z.record(
  z.string(), // "0".."6"
  daySlotSchema
).nullable()

const postSchema = z.object({
  storeId: z.number().int(),
  userId: z.string().uuid(),
  effectiveDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  scope: z.enum(['ongoing', 'week']).optional(),
  type: z.enum(['na', 'open', 'partial']).optional(),
  partialHours: partialHoursSchema.optional(),
  daySchedule: dayScheduleSchema.optional(),
})

/** GET /api/availability?storeId=101 — list availability for store (with user names). */
export async function GET(request: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (user.role === 'associate') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const storeId = searchParams.get('storeId')
  if (!storeId) return NextResponse.json({ error: 'Missing storeId' }, { status: 400 })
  const sid = parseInt(storeId, 10)
  if (Number.isNaN(sid)) return NextResponse.json({ error: 'Invalid storeId' }, { status: 400 })
  const weekStart = searchParams.get('weekStart') ?? null

  if (user.role === 'leader' && user.storeId !== sid) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const rows = await db
    .select({
      id: availability.id,
      storeId: availability.storeId,
      userId: availability.userId,
      effectiveDate: availability.effectiveDate,
      scope: availability.scope,
      type: availability.type,
      partialHours: availability.partialHours,
      daySchedule: availability.daySchedule,
      userName: users.name,
    })
    .from(availability)
    .innerJoin(users, eq(availability.userId, users.id))
    .where(eq(availability.storeId, sid))
    .orderBy(desc(availability.effectiveDate))

  let weekAvailability: Record<string, Record<number, { type: string; start?: string; end?: string }>> | null = null
  if (weekStart && /^\d{4}-\d{2}-\d{2}$/.test(weekStart)) {
    const storeUsers = await db.select({ id: users.id, name: users.name }).from(users).where(eq(users.storeId, sid))
    const allAvail = await db
      .select()
      .from(availability)
      .where(eq(availability.storeId, sid))
      .orderBy(desc(availability.effectiveDate))

    weekAvailability = {}
    for (const u of storeUsers) {
      weekAvailability[u.name] = {}
      const weekRow = allAvail.find(
        (a) => a.userId === u.id && String(a.effectiveDate) === weekStart && a.scope === 'week'
      )
      if (weekRow?.daySchedule && typeof weekRow.daySchedule === 'object') {
        const ds = weekRow.daySchedule as Record<string, { type: string; start?: string; end?: string }>
        for (let day = 0; day < 7; day++) {
          const slot = ds[String(day)]
          weekAvailability[u.name][day] = slot && slot.type ? { type: slot.type, start: slot.start, end: slot.end } : { type: 'open' }
        }
      } else {
        for (let day = 0; day < 7; day++) {
          const date = addDays(weekStart, day)
          const ongoing = allAvail
            .filter(
              (a) =>
                a.userId === u.id &&
                a.scope === 'ongoing' &&
                String(a.effectiveDate) <= date
            )
            .sort((a, b) => String(b.effectiveDate).localeCompare(String(a.effectiveDate)))[0]
          if (ongoing?.daySchedule && typeof ongoing.daySchedule === 'object') {
            const ds = ongoing.daySchedule as Record<string, { type: string; start?: string; end?: string }>
            const slot = ds[String(day)]
            weekAvailability[u.name][day] = slot && slot.type ? { type: slot.type, start: slot.start, end: slot.end } : { type: 'open' }
          } else if (ongoing) {
            weekAvailability[u.name][day] = { type: ongoing.type }
            if (ongoing.type === 'partial' && ongoing.partialHours && typeof ongoing.partialHours === 'object') {
              const ph = ongoing.partialHours as Record<string, [string, string] | null>
              const slot = ph[String(day)]
              if (slot && Array.isArray(slot)) {
                weekAvailability[u.name][day].start = slot[0]
                weekAvailability[u.name][day].end = slot[1]
              }
            }
          } else {
            weekAvailability[u.name][day] = { type: 'open' }
          }
        }
      }
    }
  }

  if (weekAvailability != null) return NextResponse.json({ data: rows, weekAvailability })
  return NextResponse.json({ data: rows })
}

/** POST /api/availability — create or update availability (upsert by storeId + userId + effectiveDate). */
export async function POST(request: Request) {
  const currentUser = await getCurrentUser()
  if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (currentUser.role === 'associate') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const body = await request.json()
    const validated = postSchema.parse(body)

    if (currentUser.role === 'leader' && currentUser.storeId !== validated.storeId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const daySchedule = validated.daySchedule ?? null
    const type = validated.type ?? (daySchedule ? 'open' : 'open')
    const partialHours = !daySchedule && validated.type === 'partial' ? (validated.partialHours ?? null) : null
    const scope = validated.scope ?? 'ongoing'

    await db
      .insert(availability)
      .values({
        storeId: validated.storeId,
        userId: validated.userId,
        effectiveDate: validated.effectiveDate,
        scope,
        type,
        partialHours: partialHours as Record<string, [string, string] | null> | null,
        daySchedule: daySchedule as Record<string, { type: string; start?: string; end?: string }> | null,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [availability.storeId, availability.userId, availability.effectiveDate, availability.scope],
        set: {
          type,
          partialHours: partialHours as Record<string, [string, string] | null> | null,
          daySchedule: daySchedule as Record<string, { type: string; start?: string; end?: string }> | null,
          updatedAt: new Date(),
        },
      })

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: err.errors }, { status: 400 })
    }
    console.error('Availability POST error:', err)
    const message = err instanceof Error ? err.message : String(err)
    if (message.includes('scope') || message.includes('day_schedule') || message.includes('availability_store_user_effective')) {
      return NextResponse.json(
        { error: 'Database schema may be out of date. Run: npm run db:migrate' },
        { status: 503 }
      )
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/** DELETE /api/availability?id=uuid — remove one availability row. */
export async function DELETE(request: Request) {
  const currentUser = await getCurrentUser()
  if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (currentUser.role === 'associate') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const [row] = await db.select().from(availability).where(eq(availability.id, id))
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (currentUser.role === 'leader' && currentUser.storeId !== row.storeId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await db.delete(availability).where(eq(availability.id, id))
  return NextResponse.json({ success: true })
}
