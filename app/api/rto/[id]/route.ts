import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { rtoRequests } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { getCurrentUser } from '@/lib/auth'
import { normalizeRole, isStoreLeader } from '@/lib/roles'
import { applyRtoApprovalToAvailabilityAndSchedule } from '@/lib/rtoAvailabilitySync'

const patchSchema = z.object({
  status: z.enum(['approved', 'denied', 'pending']),
  leaderNote: z.string().optional(),
})

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (normalizeRole(user.role) === 'lead' || normalizeRole(user.role) === 'associate') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { id } = await params
    const body = await request.json()
    const { status, leaderNote } = patchSchema.parse(body)

    const [existing] = await db
      .select()
      .from(rtoRequests)
      .where(eq(rtoRequests.id, id))
      .limit(1)

    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    if (isStoreLeader(user) && user.storeId !== existing.storeId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const [updated] = await db
      .update(rtoRequests)
      .set({
        status,
        leaderNote: leaderNote ?? null,
        updatedAt: new Date(),
      })
      .where(eq(rtoRequests.id, id))
      .returning()

    // When approved: update availability and schedule so OFF/PTO/partial show on schedule
    if (status === 'approved') {
      try {
        await applyRtoApprovalToAvailabilityAndSchedule({
          storeId: existing.storeId,
          employeeName: existing.employeeName,
          employeeEmail: existing.employeeEmail,
          requestedDays: existing.requestedDays,
          type: existing.type,
          partialTime: existing.partialTime,
        })
      } catch (e) {
        console.error('Failed to sync RTO approval to availability/schedule:', e)
      }
    }

    // Send email notification if approved/denied
    if (status !== 'pending') {
      try {
        await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/rto/email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            requestId: id,
            employeeName: existing.employeeName,
            employeeEmail: existing.employeeEmail,
            type: existing.type,
            requestedDays: existing.requestedDays,
            status,
            leaderNote,
            storeId: existing.storeId,
          }),
        })
      } catch (e) {
        console.error('Failed to send RTO email:', e)
      }
    }

    return NextResponse.json({ data: updated })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 })
    }
    console.error('RTO PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
