import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { rtoRequests } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { getCurrentUser } from '@/lib/auth'
import { normalizeRole, isStoreLeader, isFullControl } from '@/lib/roles'
import { applyRtoApprovalToAvailabilityAndSchedule, revertRtoFromSchedule } from '@/lib/rtoAvailabilitySync'
import { getStore } from '@/lib/stores'
import { sendRTODecisionEmail } from '@/lib/rto-email'

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

    // When undoing approval (revert to pending): clear OFF/PTO/partial from schedule so days are open again
    if (status === 'pending' && existing.status === 'approved') {
      try {
        await revertRtoFromSchedule({
          storeId: existing.storeId,
          employeeName: existing.employeeName,
          employeeEmail: existing.employeeEmail,
          requestedDays: existing.requestedDays,
          startDate: existing.startDate ?? undefined,
          endDate: existing.endDate ?? undefined,
        })
      } catch (e) {
        console.error('Failed to revert RTO from schedule:', e)
      }
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
          startDate: existing.startDate ?? undefined,
          endDate: existing.endDate ?? undefined,
        })
      } catch (e) {
        console.error('Failed to sync RTO approval to availability/schedule:', e)
      }
    }

    let emailWarning: string | undefined
    if (status !== 'pending') {
      try {
        const store = getStore(existing.storeId)
        const storeName = store?.name ?? 'Store'
        const leader = { email: user.email ?? '', name: user.name ?? 'Store Leader' }
        const requestPayload = {
          id: existing.id,
          employeeName: existing.employeeName,
          employeeEmail: existing.employeeEmail,
          storeId: existing.storeId,
          storeName,
          requestType: existing.type,
          requestedDays: existing.requestedDays,
          leaderNote: existing.leaderNote ?? null,
          status: status as 'approved' | 'denied',
        }
        const { success } = await sendRTODecisionEmail(
          requestPayload,
          leader,
          status as 'approved' | 'denied',
          leaderNote ?? undefined
        )
        if (!success && leader.email) {
          emailWarning = 'Email delivery failed'
          console.warn(`[RTO] Decision email failed for request ${id}`)
        }
      } catch (e) {
        console.error('Failed to send RTO decision email (non-blocking):', e)
        emailWarning = 'Email delivery failed'
      }
    }

    return NextResponse.json(
      emailWarning ? { data: updated, success: true, emailWarning } : { data: updated }
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 })
    }
    console.error('RTO PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (normalizeRole(user.role) === 'lead' || normalizeRole(user.role) === 'associate') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { id } = await params
    const [existing] = await db
      .select()
      .from(rtoRequests)
      .where(eq(rtoRequests.id, id))
      .limit(1)

    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    if (isStoreLeader(user) && user.storeId !== existing.storeId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (existing.status === 'approved') {
      try {
        await revertRtoFromSchedule({
          storeId: existing.storeId,
          employeeName: existing.employeeName,
          employeeEmail: existing.employeeEmail,
          requestedDays: existing.requestedDays,
          startDate: existing.startDate ?? undefined,
          endDate: existing.endDate ?? undefined,
        })
      } catch (e) {
        console.error('Failed to revert RTO from schedule on delete:', e)
      }
    }

    await db.delete(rtoRequests).where(eq(rtoRequests.id, id))
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('RTO DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
