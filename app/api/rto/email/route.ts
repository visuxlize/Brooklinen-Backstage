import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getResend } from '@/lib/resend'
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
    const statusUpper = status.toUpperCase()

    const leaderNoteHtml =
      leaderNote
        ? `<p style="color: #334155;"><strong>Note from your leader:</strong> ${leaderNote}</p>`
        : ''

    const resend = getResend()
    await resend.emails.send({
      from: 'Brooklinen Retail Ops <scheduling@brooklinen.com>',
      to: employeeEmail,
      subject: `Your ${type} request has been ${statusWord} — Brooklinen ${storeName}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1E293B;">
          <h2 style="color: #0F1F3D; margin-bottom: 8px;">Brooklinen Retail Operations</h2>
          <hr style="border: none; border-top: 1px solid #E2E8F0; margin-bottom: 24px;" />

          <p>Hi ${employeeName},</p>

          <p>Your <strong>${type}</strong> request for <strong>${requestedDays}</strong> has been 
            <span style="font-weight: bold; color: ${status === 'approved' ? '#16a34a' : '#dc2626'};">
              ${statusUpper}
            </span>.
          </p>

          ${leaderNoteHtml}

          <p style="color: #64748B;">
            If you have questions, please speak with your store leader directly.
          </p>

          <hr style="border: none; border-top: 1px solid #E2E8F0; margin-top: 24px; margin-bottom: 16px;" />
          <p style="color: #94A3B8; font-size: 12px;">— Brooklinen Retail Operations</p>
        </div>
      `,
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
