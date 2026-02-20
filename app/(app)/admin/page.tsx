import { redirect } from 'next/navigation'
import { requireRole } from '@/lib/auth'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { AdminPanel } from './AdminPanel'

export default async function AdminPage() {
  const user = await requireRole(['ops'])
  if (!user) redirect('/schedule')

  const allUsers = await db.select().from(users).orderBy(users.createdAt)

  return <AdminPanel users={allUsers} />
}
