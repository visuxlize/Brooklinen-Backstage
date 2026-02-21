import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { availability, users } from '@/lib/db/schema'
import { eq, and, desc } from 'drizzle-orm'
import { getCurrentUser } from '@/lib/auth'

const partialHoursSchema = z.record(
  z.string(), // "0".."6" for Sun-Sat
  z.tuple([z.string(), z.string()]).nullable() // [start, end] e.g. ["14:00","21:00"] or null
).nullable()

const postSchema = z.object({
  storeId: z.number().int(),
  userId: z.string().uuid(),
  effectiveDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  type: z.enum(['na', 'open', 'partial']),
  partialHours: partialHoursSchema.optional(),
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

  if (user.role === 'leader' && user.storeId !== sid) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const rows = await db
    .select({
      id: availability.id,
      storeId: availability.storeId,
      userId: availability.userId,
      effectiveDate: availability.effectiveDate,
      type: availability.type,
      partialHours: availability.partialHours,
      userName: users.name,
    })
    .from(availability)
    .innerJoin(users, eq(availability.userId, users.id))
    .where(eq(availability.storeId, sid))
    .orderBy(desc(availability.effectiveDate))

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

    const partialHours = validated.type === 'partial' ? (validated.partialHours ?? null) : null

    await db
      .insert(availability)
      .values({
        storeId: validated.storeId,
        userId: validated.userId,
        effectiveDate: validated.effectiveDate,
        type: validated.type,
        partialHours: partialHours as Record<string, [string, string] | null> | null,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [availability.storeId, availability.userId, availability.effectiveDate],
        set: {
          type: validated.type,
          partialHours: partialHours as Record<string, [string, string] | null> | null,
          updatedAt: new Date(),
        },
      })

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: err.errors }, { status: 400 })
    }
    console.error('Availability POST error:', err)
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
