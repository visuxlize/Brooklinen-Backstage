import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { rtoRequests, users } from '@/lib/db/schema'
import { eq, and, desc, inArray } from 'drizzle-orm'
import { getCurrentUser } from '@/lib/auth'
import { normalizeRole, isFullControl } from '@/lib/roles'
import { getStore } from '@/lib/stores'
import { sendRTOSubmissionNotification } from '@/lib/rto-email'

const postSchema = z.object({
  storeId: z.number().int(),
  employeeName: z.string().min(1),
  employeeEmail: z.string().email(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  type: z.enum(['RTO', 'PTO', 'Partial']),
  partialTime: z.string().optional(),
  note: z.string().optional(),
}).refine((data) => data.type !== 'Partial' || (data.partialTime && data.partialTime.trim().length > 0), {
  message: 'Partial Time Off requires start and end times',
  path: ['partialTime'],
}).refine((data) => data.startDate <= data.endDate, {
  message: 'End date must be on or after start date',
  path: ['endDate'],
})

export async function GET(request: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (normalizeRole(user.role) === 'lead' || normalizeRole(user.role) === 'associate') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const storeId = parseInt(searchParams.get('storeId') ?? '')

  if (isNaN(storeId)) {
    return NextResponse.json({ error: 'Missing storeId' }, { status: 400 })
  }

  if (!isFullControl(user) && user.storeId !== storeId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const data = await db
    .select()
    .from(rtoRequests)
    .where(eq(rtoRequests.storeId, storeId))
    .orderBy(desc(rtoRequests.createdAt))

  return NextResponse.json({ data })
}

/** Format date range for display (e.g. "Mar 8 – Mar 14, 2026"). */
function formatRequestedDaysDisplay(startDate: string, endDate: string): string {
  const start = new Date(startDate)
  const end = new Date(endDate)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return `${startDate} – ${endDate}`
  const sameYear = start.getFullYear() === end.getFullYear()
  const sameMonth = sameYear && start.getMonth() === end.getMonth()
  const fmtShort = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' })
  const fmtYear = new Intl.DateTimeFormat('en-US', { year: 'numeric' })
  if (startDate === endDate) return `${fmtShort.format(start)}, ${fmtYear.format(start)}`
  if (sameMonth) return `${fmtShort.format(start)} ${start.getDate()} – ${end.getDate()}, ${fmtYear.format(end)}`
  if (sameYear) return `${fmtShort.format(start)} ${start.getDate()} – ${fmtShort.format(end)} ${end.getDate()}, ${fmtYear.format(end)}`
  return `${fmtShort.format(start)} ${start.getDate()}, ${fmtYear.format(start)} – ${fmtShort.format(end)} ${end.getDate()}, ${fmtYear.format(end)}`
}

export async function POST(request: Request) {
  // Public — no auth required
  try {
    const body = await request.json()
    const validated = postSchema.parse(body)

    const requestedDaysDisplay = formatRequestedDaysDisplay(validated.startDate, validated.endDate)

    const [inserted] = await db
      .insert(rtoRequests)
      .values({
        storeId: validated.storeId,
        employeeName: validated.employeeName,
        employeeEmail: validated.employeeEmail,
        requestedDays: requestedDaysDisplay,
        startDate: validated.startDate,
        endDate: validated.endDate,
        type: validated.type,
        partialTime: validated.partialTime ?? null,
        note: validated.note ?? null,
        status: 'pending',
      })
      .returning()

    if (inserted) {
      try {
        const store = getStore(validated.storeId)
        const storeName = store?.name ?? 'Store'
        const leaderRows = await db
          .select({ email: users.email, name: users.name })
          .from(users)
          .where(
            and(
              eq(users.storeId, validated.storeId),
              inArray(users.role, ['leader', 'store_leader'])
            )
          )
        const leaders = leaderRows
          .filter((r) => r.email?.trim())
          .map((r) => ({ email: r.email!, name: r.name ?? 'Store Leader' }))
        const { sent, failed } = await sendRTOSubmissionNotification(
          {
            employeeName: validated.employeeName,
            employeeEmail: validated.employeeEmail,
            storeId: validated.storeId,
            storeName,
            requestType: validated.type,
            requestedDays: requestedDaysDisplay,
            note: validated.note ?? null,
          },
          leaders
        )
        if (failed > 0) {
          console.warn(`[RTO] Submission notifications: ${sent} sent, ${failed} failed`)
        }
      } catch (e) {
        console.error('[RTO] Leader notification email error (non-blocking):', e)
      }
    }

    return NextResponse.json({ data: inserted }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 })
    }
    console.error('RTO POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
