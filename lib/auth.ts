import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export type CurrentUser = {
  id: string
  name: string
  email: string
  role: string
  storeId: number | null
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return null

    const [dbUser] = await db.select().from(users).where(eq(users.id, user.id)).limit(1)
    if (!dbUser) return null

    return {
      id: dbUser.id,
      name: dbUser.name,
      email: dbUser.email,
      role: dbUser.role,
      storeId: dbUser.storeId ?? null,
    }
  } catch {
    return null
  }
}

export async function requireRole(allowedRoles: string[]): Promise<CurrentUser | null> {
  const user = await getCurrentUser()
  if (!user || !allowedRoles.includes(user.role)) {
    return null
  }
  return user
}
