import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { STORE_CONFIG } from '@/lib/stores'
import { normalizeRole, adminSeesAllStores } from '@/lib/roles'
import { db } from '@/lib/db'
import { promotions } from '@/lib/db/schema'
import { gte, asc } from 'drizzle-orm'
import { DashboardClient, type DashboardCard } from '@/components/dashboard/DashboardClient'

export default async function DashboardPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const role = normalizeRole(user.role)
  const isLeader = role === 'ops' || role === 'area_manager' || role === 'store_leader' || role === 'lead'
  const storeParam = user.storeId ? `?store=${user.storeId}` : ''
  const activeStore = user.storeId ? STORE_CONFIG.find((s) => s.id === user.storeId) : STORE_CONFIG[0]
  const storeName = activeStore?.name ?? 'All stores'

  const cards: DashboardCard[] = [
    {
      title: 'Schedule',
      description: 'View and edit weekly schedules, shifts, and hours.',
      href: `/schedule${storeParam}`,
      icon: 'Calendar',
      color: 'from-blue-500 to-blue-600',
    },
    {
      title: 'RTO',
      description: 'Request time off, PTO, or partial time. Review and approve requests.',
      href: `/rto${storeParam}`,
      icon: 'FileText',
      color: 'from-violet-500 to-violet-600',
    },
    {
      title: 'Daily Ops',
      description: 'Daily operations, zoning, and nightly recap.',
      href: `/daily-ops${storeParam}`,
      icon: 'ClipboardList',
      color: 'from-amber-500 to-amber-600',
    },
    {
      title: 'Availability',
      description: 'Manage your availability and time-off preferences.',
      href: `/availability${storeParam}`,
      icon: 'BarChart3',
      color: 'from-emerald-500 to-emerald-600',
    },
  ]

  if (isLeader || adminSeesAllStores({ role: user.role, storeId: user.storeId })) {
    cards.push({
      title: 'Traffic',
      description: 'Traffic trends and weekly data.',
      href: `/traffic${storeParam}`,
      icon: 'BarChart3',
      color: 'from-slate-600 to-slate-700',
    })
  }

  if (role === 'ops' || role === 'area_manager' || role === 'store_leader') {
    cards.push({
      title: 'User Management',
      description: 'Manage users, roles, and store assignments.',
      href: '/admin',
      icon: 'Users',
      color: 'from-slate-700 to-slate-800',
    })
  }

  const today = new Date().toISOString().slice(0, 10)
  let initialPromotions: { id: string; name: string; startDate: string; endDate: string; description: string | null }[] = []
  try {
    const list = await db
      .select()
      .from(promotions)
      .where(gte(promotions.startDate, today))
      .orderBy(asc(promotions.startDate))
    initialPromotions = list.map((p) => ({
      id: p.id,
      name: p.name,
      startDate: p.startDate,
      endDate: p.endDate,
      description: p.description,
    }))
  } catch {
    // ignore
  }

  const canCustomizeQuickLinks = role === 'ops' || role === 'area_manager' || role === 'store_leader'

  return (
    <DashboardClient
      userName={user.name.split(' ')[0]}
      storeName={storeName}
      cards={cards}
      canCustomizeQuickLinks={canCustomizeQuickLinks}
      initialPromotions={initialPromotions}
    />
  )
}
