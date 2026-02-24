import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { userGoogleCalendarTokens } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

/** DELETE: Remove Google Calendar tokens for the current user (disconnect). */
export async function DELETE() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await db
    .delete(userGoogleCalendarTokens)
    .where(eq(userGoogleCalendarTokens.userId, user.id))

  return NextResponse.json({ ok: true })
}
