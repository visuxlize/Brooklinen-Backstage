import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentUser } from '@/lib/auth'
import { normalizeRole, isStoreLeader } from '@/lib/roles'
import { resend } from '@/lib/resend'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { and, eq } from 'drizzle-orm'
import { getStore } from '@/lib/stores'
import { format } from 'date-fns'

const schema = z.object({
  storeId: z.number().int(),
  weekStart: z.string(),
  imageBase64: z.string(),
  recipientEmails: z.array(z.string().email()).optional(),
})

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (normalizeRole(user.role) === 'lead' || normalizeRole(user.role) === 'associate') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const body = await request.json()
    const { storeId, weekStart, imageBase64, recipientEmails } = schema.parse(body)

    if (isStoreLeader(user) && user.storeId !== storeId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const store = getStore(storeId)
    if (!store) return NextResponse.json({ error: 'Store not found' }, { status: 404 })

    // Get associate emails for this store
    let emails = recipientEmails
    if (!emails || emails.length === 0) {
      const associates = await db
        .select({ email: users.email, name: users.name })
        .from(users)
        .where(and(eq(users.storeId, storeId), eq(users.role, 'associate')))
      emails = associates.map((a) => a.email)
    }

    if (emails.length === 0) {
      return NextResponse.json({ message: 'No recipients found', sent: 0 })
    }

    const weekDate = new Date(weekStart)
    const weekEndDate = new Date(weekDate)
    weekEndDate.setDate(weekEndDate.getDate() + 6)
    const dateRange = `${format(weekDate, 'MMM d')} – ${format(weekEndDate, 'MMM d, yyyy')}`

    // Strip the data URL prefix
    const base64Data = imageBase64.replace(/^data:image\/png;base64,/, '')

    const results = await Promise.allSettled(
      emails.map((email) =>
        resend.emails.send({
          from: 'Brooklinen Retail Ops <scheduling@brooklinen.com>',
          to: email,
          subject: `Schedule — ${store.name} — Week of ${weekStart}`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
              <h2 style="color: #0F1F3D; margin-bottom: 8px;">${store.name} Schedule</h2>
              <p style="color: #64748B; margin-bottom: 24px;">Week of ${dateRange}</p>
              <img src="cid:schedule" alt="Schedule" style="width: 100%; border-radius: 12px; border: 1px solid #E2E8F0;" />
              <p style="color: #94A3B8; font-size: 12px; margin-top: 24px;">
                — Brooklinen Retail Operations
              </p>
            </div>
          `,
          attachments: [
            {
              filename: `schedule-${store.name.toLowerCase().replace(/\s+/g, '-')}-${weekStart}.png`,
              content: base64Data,
              contentType: 'image/png',
            },
          ],
        })
      )
    )

    const sent = results.filter((r) => r.status === 'fulfilled').length
    return NextResponse.json({ success: true, sent })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 })
    }
    console.error('Schedule email error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
