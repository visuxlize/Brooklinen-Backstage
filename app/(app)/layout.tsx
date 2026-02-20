import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { rtoRequests, stores } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { STORE_CONFIG } from '@/lib/stores'
import { AppLayoutClient } from './AppLayoutClient'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  // Fetch pending RTO counts per store
  const pendingCounts: Record<number, number> = {}

  if (user.role === 'ops') {
    const pending = await db
      .select({ storeId: rtoRequests.storeId })
      .from(rtoRequests)
      .where(eq(rtoRequests.status, 'pending'))

    for (const row of pending) {
      pendingCounts[row.storeId] = (pendingCounts[row.storeId] ?? 0) + 1
    }
  } else if (user.storeId) {
    const pending = await db
      .select({ storeId: rtoRequests.storeId })
      .from(rtoRequests)
      .where(and(eq(rtoRequests.storeId, user.storeId), eq(rtoRequests.status, 'pending')))

    for (const row of pending) {
      pendingCounts[row.storeId] = (pendingCounts[row.storeId] ?? 0) + 1
    }
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
