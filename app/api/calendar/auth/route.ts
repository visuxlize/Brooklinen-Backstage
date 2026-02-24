import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getAppUrl } from '@/lib/app-config'

/** GET: Redirect to Google OAuth2 consent for Calendar. */
export async function GET() {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.redirect(new URL('/login', getAppUrl()))
  }

  const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID
  if (!clientId) {
    return NextResponse.redirect(new URL('/dashboard?calendar=not_configured', getAppUrl()))
  }

  const base = getAppUrl()
  const redirectUri = `${base}/api/calendar/callback`
  const scope = 'https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events.readonly'
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope,
    access_type: 'offline',
    prompt: 'consent',
  })

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
  return NextResponse.redirect(authUrl)
}
