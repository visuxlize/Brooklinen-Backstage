import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { AdminPanel } from './AdminPanel'

export default async function AdminPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  // Associates cannot access this page
  if (user.role === 'associate') redirect('/schedule')

  // Ops sees all users; leaders see only their store's users
  let allUsers
  if (user.role === 'ops') {
    allUsers = await db.select().from(users).orderBy(users.createdAt)
  } else {
    allUsers = await db
      .select()
      .from(users)
      .where(eq(users.storeId, user.storeId!))
      .orderBy(users.createdAt)
  }

  return <AdminPanel users={allUsers} currentUser={user} />
}
