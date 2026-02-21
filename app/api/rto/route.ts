import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { rtoRequests } from '@/lib/db/schema'
import { eq, and, desc } from 'drizzle-orm'
import { getCurrentUser } from '@/lib/auth'

const postSchema = z.object({
  storeId: z.number().int(),
  employeeName: z.string().min(1),
  employeeEmail: z.string().email(),
  requestedDays: z.string().min(1),
  type: z.enum(['RTO', 'PTO', 'Partial']),
  partialTime: z.string().optional(),
  note: z.string().optional(),
}).refine((data) => data.type !== 'Partial' || (data.partialTime && data.partialTime.trim().length > 0), {
  message: 'Partial Time Off requires start and end times',
  path: ['partialTime'],
})

export async function GET(request: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (user.role === 'associate') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const storeId = parseInt(searchParams.get('storeId') ?? '')

  if (isNaN(storeId)) {
    return NextResponse.json({ error: 'Missing storeId' }, { status: 400 })
  }

  if (user.role !== 'ops' && user.storeId !== storeId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const data = await db
    .select()
    .from(rtoRequests)
    .where(eq(rtoRequests.storeId, storeId))
    .orderBy(desc(rtoRequests.createdAt))

  return NextResponse.json({ data })
}

export async function POST(request: Request) {
  // Public — no auth required
  try {
    const body = await request.json()
    const validated = postSchema.parse(body)

    const [inserted] = await db
      .insert(rtoRequests)
      .values({
        storeId: validated.storeId,
        employeeName: validated.employeeName,
        employeeEmail: validated.employeeEmail,
        requestedDays: validated.requestedDays,
        type: validated.type,
        partialTime: validated.partialTime ?? null,
        note: validated.note ?? null,
        status: 'pending',
      })
      .returning()

    return NextResponse.json({ data: inserted }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 })
    }
    console.error('RTO POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
