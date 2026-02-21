import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq, sql } from 'drizzle-orm'

/**
 * GET /api/link-profile
 * While signed in, open this URL to link your Supabase Auth account to an existing
 * users row by email (e.g. after seed with placeholder id). Then redirects to /schedule.
 */
export async function GET(request: Request) {
  const base = request.headers.get('x-forwarded-host')
    ? `${request.headers.get('x-forwarded-proto') ?? 'https'}://${request.headers.get('x-forwarded-host')}`
    : request.url.replace(/\/api\/link-profile.*$/, '')
  const baseUrl = base || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()

  if (!authUser) {
    return NextResponse.redirect(new URL('/login', baseUrl))
  }

  const existing = await db.select().from(users).where(eq(users.id, authUser.id)).limit(1)
  if (existing[0]) {
    return NextResponse.redirect(new URL('/schedule', baseUrl))
  }

  if (!authUser.email?.trim()) {
    return NextResponse.json(
      { error: 'No email on auth account', authId: authUser.id },
      { status: 400 }
    )
  }

  const emailLower = authUser.email.trim().toLowerCase()
  const byEmail = await db
    .select()
    .from(users)
    .where(sql`lower(${users.email}) = ${emailLower}`)
    .limit(1)

  const match = byEmail[0]
  if (!match) {
    return NextResponse.json(
      {
        error: 'No user in database with this email',
        email: emailLower,
        hint: 'Ask an admin to add you in User Management, or add a row in the users table with this email.',
      },
      { status: 404 }
    )
  }

  try {
    await db.update(users).set({ id: authUser.id }).where(eq(users.id, match.id))
  } catch (err) {
    console.error('Link profile update failed:', err)
    return NextResponse.json(
      { error: 'Failed to update user id', detail: String(err) },
      { status: 500 }
    )
  }

  return NextResponse.redirect(new URL('/schedule', baseUrl))
}
