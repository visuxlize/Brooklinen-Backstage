import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getCalendarRedirectBaseUrl } from '@/lib/app-config'
import { db } from '@/lib/db'
import { userGoogleCalendarTokens } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

const TOKEN_URL = 'https://oauth2.googleapis.com/token'

/** GET: Exchange OAuth code for tokens and store them. */
export async function GET(request: Request) {
  const user = await getCurrentUser()
  const base = getCalendarRedirectBaseUrl()
  if (!user) {
    return NextResponse.redirect(new URL('/login', base))
  }

  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  if (error) {
    return NextResponse.redirect(new URL('/dashboard?calendar=denied', base))
  }

  if (!code) {
    return NextResponse.redirect(new URL('/dashboard?calendar=error', base))
  }

  const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CALENDAR_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL('/dashboard?calendar=not_configured', base))
  }

  const redirectUri = `${base}/api/calendar/callback`
  const body = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  })

  const tokenRes = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })

  if (!tokenRes.ok) {
    const err = await tokenRes.text()
    console.error('Google token exchange failed:', err)
    return NextResponse.redirect(new URL('/dashboard?calendar=error', base))
  }

  const data = await tokenRes.json()
  const accessToken = data.access_token
  const refreshToken = data.refresh_token
  const expiresIn = data.expires_in ?? 3600
  const expiresAt = new Date(Date.now() + expiresIn * 1000)

  if (!accessToken) {
    return NextResponse.redirect(new URL('/dashboard?calendar=error', base))
  }

  try {
    const setPayload: Record<string, unknown> = {
      accessToken,
      expiresAt,
      updatedAt: new Date(),
    }
    if (refreshToken != null) setPayload.refreshToken = refreshToken

    await db
      .insert(userGoogleCalendarTokens)
      .values({
        userId: user.id,
        accessToken,
        refreshToken: refreshToken ?? null,
        expiresAt,
      })
      .onConflictDoUpdate({
        target: userGoogleCalendarTokens.userId,
        set: setPayload as { accessToken: string; expiresAt: Date; updatedAt: Date; refreshToken?: string },
      })
  } catch (e) {
    console.error('Failed to store Google Calendar tokens:', e)
    return NextResponse.redirect(new URL('/dashboard?calendar=error', base))
  }

  return NextResponse.redirect(new URL('/dashboard?calendar=connected', base))
}
