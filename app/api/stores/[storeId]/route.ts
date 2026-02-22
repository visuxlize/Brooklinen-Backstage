import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { stores } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { getCurrentUser } from '@/lib/auth'
import { isFullControl } from '@/lib/roles'

const hoursSchema = z.object({
  sun: z.string(),
  mon: z.string(),
  tue: z.string(),
  wed: z.string(),
  thu: z.string(),
  fri: z.string(),
  sat: z.string(),
})

const patchSchema = z.object({
  hours: hoursSchema.optional(),
})

export async function GET(
  request: Request,
  { params }: { params: Promise<{ storeId: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { storeId: storeIdParam } = await params
  const storeId = parseInt(storeIdParam ?? '', 10)
  if (Number.isNaN(storeId)) {
    return NextResponse.json({ error: 'Invalid storeId' }, { status: 400 })
  }

  if (!isFullControl(user) && user.storeId !== storeId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const [store] = await db.select().from(stores).where(eq(stores.id, storeId)).limit(1)
  if (!store) return NextResponse.json({ error: 'Store not found' }, { status: 404 })

  return NextResponse.json({
    id: store.id,
    name: store.name,
    city: store.city,
    color: store.color,
    hours: store.hours,
  })
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ storeId: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isFullControl(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { storeId: storeIdParam } = await params
  const storeId = parseInt(storeIdParam ?? '', 10)
  if (Number.isNaN(storeId)) {
    return NextResponse.json({ error: 'Invalid storeId' }, { status: 400 })
  }

  try {
    const body = await request.json()
    const { hours } = patchSchema.parse(body)

    if (!hours) {
      return NextResponse.json({ error: 'hours required' }, { status: 400 })
    }

    await db
      .update(stores)
      .set({ hours: { ...hours } })
      .where(eq(stores.id, storeId))

    const [updated] = await db.select().from(stores).where(eq(stores.id, storeId)).limit(1)
    return NextResponse.json(updated)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 })
    }
    console.error('Store PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
