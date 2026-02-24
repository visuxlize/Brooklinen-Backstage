import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { userGoogleCalendarTokens } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

/** GET: Return the current user's Google Calendar access token so the client can store it in localStorage. */
export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [row] = await db
    .select({ accessToken: userGoogleCalendarTokens.accessToken })
    .from(userGoogleCalendarTokens)
    .where(eq(userGoogleCalendarTokens.userId, user.id))
    .limit(1)

  if (!row) return NextResponse.json({ accessToken: null })
  return NextResponse.json({ accessToken: row.accessToken })
}
