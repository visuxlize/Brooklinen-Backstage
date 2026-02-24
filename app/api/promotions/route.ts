import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { promotions } from '@/lib/db/schema'
import { gte, asc } from 'drizzle-orm'
import { getCurrentUser } from '@/lib/auth'
import { canAccessAdmin } from '@/lib/roles'
import { z } from 'zod'

const postSchema = z.object({
  name: z.string().min(1).max(200),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  description: z.string().max(1000).optional(),
})

/** GET: List upcoming promotions (startDate >= today), ordered by startDate. */
export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const today = new Date().toISOString().slice(0, 10)
  const list = await db
    .select()
    .from(promotions)
    .where(gte(promotions.startDate, today))
    .orderBy(asc(promotions.startDate))

  return NextResponse.json(
    list.map((p) => ({
      id: p.id,
      name: p.name,
      startDate: p.startDate,
      endDate: p.endDate,
      description: p.description,
    }))
  )
}

/** POST: Create promotion (admin/manager only). */
export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canAccessAdmin({ role: user.role, storeId: user.storeId })) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json().catch(() => ({}))
  const parsed = postSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })
  }

  const { name, startDate, endDate, description } = parsed.data
  const [created] = await db
    .insert(promotions)
    .values({ name, startDate, endDate, description: description ?? null })
    .returning()

  return NextResponse.json({
    id: created.id,
    name: created.name,
    startDate: created.startDate,
    endDate: created.endDate,
    description: created.description,
  }, { status: 201 })
}
