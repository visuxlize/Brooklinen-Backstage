import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { users, type User } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { canAccessAdmin, adminSeesAllStores } from '@/lib/roles'
import { AdminPanel } from './AdminPanel'

export default async function AdminPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  if (!canAccessAdmin(user)) redirect('/schedule')

  // OPS / Area Manager see all users; Store Leader sees only their store
  let allUsers: User[]
  if (adminSeesAllStores(user)) {
    allUsers = await db.select().from(users).orderBy(users.createdAt)
  } else {
    if (!user.storeId) {
      allUsers = []
    } else {
      allUsers = await db
        .select()
        .from(users)
        .where(eq(users.storeId, user.storeId))
        .orderBy(users.createdAt)
    }
  }

  return <AdminPanel users={allUsers} currentUser={user} />
}
