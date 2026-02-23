import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getResend } from '@/lib/resend'
import { buildRtoEmailHtml } from '@/lib/email-templates'
import { getStore } from '@/lib/stores'

const schema = z.object({
  employeeName: z.string(),
  employeeEmail: z.string().email(),
  type: z.string(),
  requestedDays: z.string(),
  status: z.enum(['approved', 'denied']),
  leaderNote: z.string().optional(),
  storeId: z.number().int(),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { employeeName, employeeEmail, type, requestedDays, status, leaderNote, storeId } =
      schema.parse(body)

    const store = getStore(storeId)
    const storeName = store?.name ?? 'Brooklinen'

    const statusWord = status === 'approved' ? 'approved' : 'denied'

    const html = buildRtoEmailHtml({
      employeeName,
      employeeEmail,
      type,
      requestedDays,
      status,
      leaderNote,
      storeName,
    })

    const resend = getResend()
    await resend.emails.send({
      from: 'Brooklinen Retail Ops <scheduling@brooklinen.com>',
      to: employeeEmail,
      subject: `Your ${type} request has been ${statusWord} — Brooklinen ${storeName}`,
      html,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
    }
    if (error instanceof Error && error.message.includes('RESEND_API_KEY')) {
      return NextResponse.json({ error: 'Email not configured' }, { status: 503 })
    }
    console.error('RTO email error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
