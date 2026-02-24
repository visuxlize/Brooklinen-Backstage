import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { userGoogleCalendarTokens } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

const CALENDAR_LIST_URL = 'https://www.googleapis.com/calendar/v3/calendars/primary/events'
const TOKEN_URL = 'https://oauth2.googleapis.com/token'

function isPromoEvent(summary: string | null, description: string | null): boolean {
  const text = `${summary ?? ''} ${description ?? ''}`.toLowerCase()
  return text.includes('promo') || text.includes('promotion')
}

/** GET: Next 5–7 upcoming events from Google Calendar. Returns empty if not connected or on error. */
export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let accessToken: string
  let refreshToken: string | null
  let expiresAt: Date

  try {
    const [row] = await db
      .select()
      .from(userGoogleCalendarTokens)
      .where(eq(userGoogleCalendarTokens.userId, user.id))
      .limit(1)
    if (!row) {
      return NextResponse.json({ events: [] })
    }
    accessToken = row.accessToken
    refreshToken = row.refreshToken
    expiresAt = row.expiresAt
  } catch {
    return NextResponse.json({ events: [] })
  }

  const now = new Date()
  if (expiresAt <= new Date(now.getTime() + 5 * 60 * 1000) && refreshToken) {
    const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CALENDAR_CLIENT_SECRET
    if (clientId && clientSecret) {
      const body = new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      })
      const tokenRes = await fetch(TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      })
      if (tokenRes.ok) {
        const data = await tokenRes.json()
        accessToken = data.access_token
        const expiresIn = data.expires_in ?? 3600
        await db
          .update(userGoogleCalendarTokens)
          .set({
            accessToken,
            expiresAt: new Date(Date.now() + expiresIn * 1000),
            updatedAt: new Date(),
          })
          .where(eq(userGoogleCalendarTokens.userId, user.id))
      }
    }
  }

  const timeMin = new Date().toISOString()
  const maxResults = 7
  const url = `${CALENDAR_LIST_URL}?timeMin=${encodeURIComponent(timeMin)}&maxResults=${maxResults}&singleEvents=true&orderBy=startTime`

  const eventsRes = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!eventsRes.ok) {
    return NextResponse.json({ events: [] })
  }

  const data = await eventsRes.json()
  const items = data.items ?? []

  const events = items.map((e: { id: string; summary?: string; description?: string; start?: { dateTime?: string; date?: string }; end?: { dateTime?: string; date?: string } }) => {
    const start = e.start?.dateTime ?? e.start?.date ?? ''
    const end = e.end?.dateTime ?? e.end?.date ?? ''
    const summary = e.summary ?? '(No title)'
    return {
      id: e.id,
      summary,
      start,
      end,
      isPromo: isPromoEvent(e.summary ?? null, e.description ?? null),
    }
  })

  return NextResponse.json({ events })
}
