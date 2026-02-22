import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { rtoRequests, users } from '@/lib/db/schema'
import { eq, and, sql } from 'drizzle-orm'
import { STORE_CONFIG } from '@/lib/stores'
import { AppLayoutClient } from './AppLayoutClient'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()

  if (!authUser) {
    redirect('/login')
  }

  // Single query: by auth id or by email (link-by-email). Reduces connection hold and avoids pool exhaustion.
  let dbUser: typeof users.$inferSelect | undefined
  try {
    const emailLower = authUser.email?.trim()?.toLowerCase() ?? ''
    const rows = await db
      .select()
      .from(users)
      .where(
        emailLower
          ? sql`(${users.id} = ${authUser.id} or lower(${users.email}) = ${emailLower})`
          : eq(users.id, authUser.id)
      )
      .limit(2)
    const byId = rows.find((r) => r.id === authUser.id)
    const byEmail = rows.find((r) => r.id !== authUser.id && emailLower && r.email?.toLowerCase() === emailLower)
    dbUser = byId ?? byEmail

    if (byEmail && !byId && dbUser) {
      try {
        await db.update(users).set({ id: authUser.id }).where(eq(users.id, dbUser.id))
      } catch {
        // e.g. unique violation if another request linked already
      }
      dbUser = { ...dbUser, id: authUser.id }
    }
  } catch (err) {
    console.error('App layout: failed to load user from database.', err)
    redirect('/login?error=no-profile')
  }

  if (!dbUser) {
    redirect('/login?error=no-profile')
  }

  const user = {
    id: dbUser.id,
    name: dbUser.name,
    email: dbUser.email,
    role: dbUser.role,
    storeId: dbUser.storeId ?? null,
  }

  // Badge: only count requests that need manager action (Pending). Approved/Denied are not shown.
  let pendingCounts: Record<number, number> = {}
  try {
    if (user.role === 'ops' || user.role === 'area_manager') {
      const pending = await db
        .select({ storeId: rtoRequests.storeId })
        .from(rtoRequests)
        .where(sql`lower(${rtoRequests.status}) = 'pending'`)

      for (const row of pending) {
        pendingCounts[row.storeId] = (pendingCounts[row.storeId] ?? 0) + 1
      }
    } else if (user.storeId) {
      const pending = await db
        .select({ storeId: rtoRequests.storeId })
        .from(rtoRequests)
        .where(and(eq(rtoRequests.storeId, user.storeId), sql`lower(${rtoRequests.status}) = 'pending'`))

      for (const row of pending) {
        pendingCounts[row.storeId] = (pendingCounts[row.storeId] ?? 0) + 1
      }
    }
  } catch {
    pendingCounts = {}
  }

  const pendingRtoCount = Object.values(pendingCounts).reduce((a, b) => a + b, 0)

  const defaultStoreId =
    user.storeId ?? STORE_CONFIG[0].id

  return (
    <AppLayoutClient
      currentUser={user}
      pendingCounts={pendingCounts}
      pendingRtoCount={pendingRtoCount}
      defaultStoreId={defaultStoreId}
    >
      {children}
    </AppLayoutClient>
  )
}
