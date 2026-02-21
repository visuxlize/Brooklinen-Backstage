import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { schedules, users, retailData } from '@/lib/db/schema'
import { and, eq, gte, lte } from 'drizzle-orm'
import { getStore, STORE_CONFIG } from '@/lib/stores'
import { ScheduleGrid } from '@/components/schedule/ScheduleGrid'
import { format, addDays } from 'date-fns'
import { getWeekStartByIndex, getWeekIndexForDate, getTotalWeeks } from '@/lib/scheduleWeeks'

interface SchedulePageProps {
  searchParams: Promise<{ store?: string; week?: string }>
}

export default async function SchedulePage({ searchParams }: SchedulePageProps) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const params = await searchParams
  // Determine store ID
  let storeId: number
  if (user.role === 'ops') {
    storeId = params.store ? parseInt(params.store) : STORE_CONFIG[0].id
  } else {
    storeId = user.storeId!
  }

  const store = getStore(storeId)
  if (!store) redirect('/schedule')

  const canEdit = user.role === 'ops' || user.role === 'leader'

  // Employees come ONLY from User Management (users table for this store)
  const storeUsers = await db
    .select({ name: users.name })
    .from(users)
    .where(eq(users.storeId, storeId))

  const weekParam = params.week != null ? parseInt(params.week, 10) : null
  const totalWeeks = getTotalWeeks()
  const initialWeekIdx =
    weekParam != null && !Number.isNaN(weekParam) && weekParam >= 0 && weekParam < totalWeeks
      ? weekParam
      : getWeekIndexForDate(new Date())
  const weekStart = getWeekStartByIndex(initialWeekIdx)
  const weekStartStr = format(weekStart, 'yyyy-MM-dd')

  const rows = await db
    .select()
    .from(schedules)
    .where(and(eq(schedules.storeId, storeId), eq(schedules.weekStart, weekStartStr)))

  const userNames = storeUsers.map((u) => u.name)
  const nameSet = new Set(userNames)
  const firstNameToCanonical: Record<string, string> = {}
  for (const fullName of userNames) {
    const first = fullName.trim().split(/\s+/)[0] ?? fullName
    firstNameToCanonical[first.toLowerCase()] = fullName
  }

  function toCanonical(name: string): string {
    const first = name.trim().split(/\s+/)[0] ?? name
    return firstNameToCanonical[first.toLowerCase()] ?? name
  }

  const initialData: Record<string, Record<number, string>> = {}
  for (const row of rows) {
    const canonical = toCanonical(row.employeeName)
    if (!nameSet.has(canonical)) continue
    if (!initialData[canonical]) initialData[canonical] = {}
    if (initialData[canonical][row.dayOfWeek] == null || initialData[canonical][row.dayOfWeek] === '')
      initialData[canonical][row.dayOfWeek] = row.shiftValue ?? ''
  }

  const employees = [...userNames].sort()

  const weekEnd = format(addDays(weekStart, 6), 'yyyy-MM-dd')
  const budgetRows = await db
    .select({ date: retailData.date, budgetNet: retailData.budgetNet, lyNet: retailData.lyNet })
    .from(retailData)
    .where(
      and(
        eq(retailData.storeId, storeId),
        gte(retailData.date, weekStartStr),
        lte(retailData.date, weekEnd)
      )
    )
  const dailyBudget: number[] = [0, 0, 0, 0, 0, 0, 0]
  const dailyLy: number[] = [0, 0, 0, 0, 0, 0, 0]
  let weeklyBudget = 0
  let weeklyLy = 0
  const [sy, sm, sd] = weekStartStr.split('-').map(Number)
  const weekStartMs = new Date(sy, sm - 1, sd).getTime()
  for (const row of budgetRows) {
    const dateStr = typeof row.date === 'string' ? row.date : (row.date as Date).toISOString().slice(0, 10)
    const [ry, rm, rd] = dateStr.split('-').map(Number)
    const dayIdx = Math.round((new Date(ry, rm - 1, rd).getTime() - weekStartMs) / (24 * 60 * 60 * 1000))
    if (dayIdx >= 0 && dayIdx <= 6) {
      const b = row.budgetNet != null ? Number(row.budgetNet) : 0
      const ly = row.lyNet != null ? Number(row.lyNet) : 0
      dailyBudget[dayIdx] = b
      dailyLy[dayIdx] = ly
      weeklyBudget += b
      weeklyLy += ly
    }
  }

  return (
    <ScheduleGrid
      store={store}
      canEdit={canEdit}
      employees={employees}
      initialData={initialData}
      weekStartDate={weekStart}
      initialWeekIdx={initialWeekIdx}
      totalWeeks={totalWeeks}
      currentUser={{ role: user.role, name: user.name }}
      initialWeeklyBudget={weeklyBudget || null}
      initialWeeklyLy={weeklyLy || null}
      initialDailyBudget={dailyBudget}
      initialDailyLy={dailyLy}
    />
  )
}
