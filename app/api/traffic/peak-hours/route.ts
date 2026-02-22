import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { storeTrafficPeak } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { getCurrentUser } from '@/lib/auth'
import { normalizeRole, isFullControl, isStoreLeader } from '@/lib/roles'

const postSchema = z.object({
  storeId: z.number().int(),
  peakWindowByDay: z.array(z.string()).length(7), // Sun..Sat
})

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (normalizeRole(user.role) === 'lead' || normalizeRole(user.role) === 'associate') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const parsed = postSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })
  }
  const { storeId, peakWindowByDay } = parsed.data

  if (isStoreLeader(user) && user.storeId !== storeId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    await db
      .insert(storeTrafficPeak)
      .values({ storeId, peakWindowByDay })
      .onConflictDoUpdate({
        target: storeTrafficPeak.storeId,
        set: { peakWindowByDay },
      })
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Failed to save peak hours:', err)
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
  }
}
