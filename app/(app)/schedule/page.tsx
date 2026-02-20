import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { schedules, users } from '@/lib/db/schema'
import { and, eq } from 'drizzle-orm'
import { getStore, STORE_CONFIG } from '@/lib/stores'
import { ScheduleGrid } from '@/components/schedule/ScheduleGrid'
import { startOfWeek, addWeeks, format } from 'date-fns'

interface SchedulePageProps {
  searchParams: { store?: string }
}

function getWeekStart(weekIdx: number): Date {
  const base = startOfWeek(new Date(), { weekStartsOn: 0 })
  const monthStart = startOfWeek(new Date(base.getFullYear(), base.getMonth(), 1), { weekStartsOn: 0 })
  return addWeeks(monthStart, weekIdx)
}

export default async function SchedulePage({ searchParams }: SchedulePageProps) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  // Determine store ID
  let storeId: number
  if (user.role === 'ops') {
    storeId = searchParams.store ? parseInt(searchParams.store) : STORE_CONFIG[0].id
  } else {
    storeId = user.storeId!
  }

  const store = getStore(storeId)
  if (!store) redirect('/schedule')

  const canEdit = user.role === 'ops' || user.role === 'leader'

  // Fetch employees for this store (users with this storeId + any existing schedule entries)
  const storeUsers = await db
    .select({ name: users.name })
    .from(users)
    .where(eq(users.storeId, storeId))

  // Get week start for current week (week 0)
  const weekStart = getWeekStart(0)
  const weekStartStr = format(weekStart, 'yyyy-MM-dd')

  // Fetch initial schedule data
  const rows = await db
    .select()
    .from(schedules)
    .where(and(eq(schedules.storeId, storeId), eq(schedules.weekStart, weekStartStr)))

  const initialData: Record<string, Record<number, string>> = {}
  for (const row of rows) {
    if (!initialData[row.employeeName]) initialData[row.employeeName] = {}
    initialData[row.employeeName][row.dayOfWeek] = row.shiftValue ?? ''
  }

  // Build employee list: from users table + any existing schedule rows
  const employeeSet = new Set<string>(storeUsers.map((u) => u.name))
  for (const row of rows) employeeSet.add(row.employeeName)
  const employees = Array.from(employeeSet).sort()

  return (
    <ScheduleGrid
      store={store}
      canEdit={canEdit}
      employees={employees}
      initialData={initialData}
      weekStartDate={weekStart}
      currentUser={{ role: user.role, name: user.name }}
    />
  )
}
