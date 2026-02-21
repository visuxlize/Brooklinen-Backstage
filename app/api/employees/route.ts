import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

/**
 * GET /api/employees?storeId=101
 * Returns employee names for the given store (from users table).
 * Used by Daily Ops Morning Wakeup employee dropdowns.
 */
export async function GET(request: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const storeId = parseInt(searchParams.get('storeId') ?? '', 10)

  if (Number.isNaN(storeId)) {
    return NextResponse.json({ error: 'Missing or invalid storeId' }, { status: 400 })
  }

  if (user.role !== 'ops' && user.storeId !== storeId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const rows = await db
    .select({ name: users.name })
    .from(users)
    .where(eq(users.storeId, storeId))
    .orderBy(users.name)

  const employees = rows.map((r) => r.name)
  return NextResponse.json(employees)
}
