import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getStore } from '@/lib/stores'
import { sendRTODecisionEmail } from '@/lib/rto-email'

const schema = z.object({
  requestId: z.string().optional(),
  employeeName: z.string(),
  employeeEmail: z.string().email(),
  type: z.string(),
  requestedDays: z.string(),
  status: z.enum(['approved', 'denied']),
  leaderNote: z.string().optional(),
  leaderName: z.string().optional(),
  leaderEmail: z.string().email().optional(),
  storeId: z.number().int(),
})

/**
 * POST /api/rto/email — send approval/denial email to employee.
 * Caller should pass leaderName and leaderEmail for FROM/Reply-To.
 * Returns 200 with emailWarning if send fails (so main action is not blocked).
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = schema.parse(body)
    const {
      employeeName,
      employeeEmail,
      type,
      requestedDays,
      status,
      leaderNote,
      storeId,
      leaderName,
      leaderEmail,
    } = parsed

    const store = getStore(storeId)
    const storeName = store?.name ?? 'Brooklinen'

    const leader = {
      name: leaderName ?? 'Store Leader',
      email: leaderEmail ?? '',
    }
    const requestPayload = {
      id: parsed.requestId ?? '',
      employeeName,
      employeeEmail,
      storeId,
      storeName,
      requestType: type,
      requestedDays,
      leaderNote: leaderNote ?? null,
      status,
    }
    const { success } = await sendRTODecisionEmail(
      requestPayload,
      leader,
      status,
      leaderNote ?? undefined
    )
    if (success) {
      console.log(`[RTO email] Decision email sent to ${employeeEmail} at ${new Date().toISOString()}`)
    } else {
      console.warn(`[RTO email] Decision email failed for ${employeeEmail}`)
    }
    return NextResponse.json(
      success ? { success: true } : { success: true, emailWarning: 'Email delivery failed' }
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 })
    }
    console.error('RTO email error:', error)
    return NextResponse.json(
      { success: true, emailWarning: 'Email delivery failed' },
      { status: 200 }
    )
  }
}
