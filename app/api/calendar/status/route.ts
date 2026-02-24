import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { userGoogleCalendarTokens } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

/** GET: Whether the current user has connected Google Calendar (has a stored token). */
export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const [row] = await db
      .select({ userId: userGoogleCalendarTokens.userId })
      .from(userGoogleCalendarTokens)
      .where(eq(userGoogleCalendarTokens.userId, user.id))
      .limit(1)
    return NextResponse.json({ connected: !!row })
  } catch {
    return NextResponse.json({ connected: false })
  }
}
