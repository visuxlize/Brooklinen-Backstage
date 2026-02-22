import Link from 'next/link'
import { Calendar, Users, ClipboardList, BarChart3, FileText, ArrowRight } from 'lucide-react'
import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { STORE_CONFIG } from '@/lib/stores'
import { normalizeRole, adminSeesAllStores } from '@/lib/roles'
import { APP_NAME_SHORT } from '@/lib/app-config'

export default async function DashboardPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const role = normalizeRole(user.role)
  const isLeader = role === 'ops' || role === 'area_manager' || role === 'store_leader' || role === 'lead'
  const storeParam = user.storeId ? `?store=${user.storeId}` : ''
  const activeStore = user.storeId ? STORE_CONFIG.find((s) => s.id === user.storeId) : STORE_CONFIG[0]

  const cards: { title: string; description: string; href: string; icon: React.ElementType; color: string }[] = [
    {
      title: 'Schedule',
      description: 'View and edit weekly schedules, shifts, and hours.',
      href: `/schedule${storeParam}`,
      icon: Calendar,
      color: 'from-blue-500 to-blue-600',
    },
    {
      title: 'RTO',
      description: 'Request time off, PTO, or partial time. Review and approve requests.',
      href: `/rto${storeParam}`,
      icon: FileText,
      color: 'from-violet-500 to-violet-600',
    },
    {
      title: 'Daily Ops',
      description: 'Daily operations, zoning, and nightly recap.',
      href: `/daily-ops${storeParam}`,
      icon: ClipboardList,
      color: 'from-amber-500 to-amber-600',
    },
    {
      title: 'Availability',
      description: 'Manage your availability and time-off preferences.',
      href: `/availability${storeParam}`,
      icon: BarChart3,
      color: 'from-emerald-500 to-emerald-600',
    },
  ]

  if (isLeader || adminSeesAllStores({ role: user.role, storeId: user.storeId })) {
    cards.push({
      title: 'Traffic',
      description: 'Traffic trends and weekly data.',
      href: `/traffic${storeParam}`,
      icon: BarChart3,
      color: 'from-slate-600 to-slate-700',
    })
  }

  if (role === 'ops' || role === 'area_manager' || role === 'store_leader') {
    cards.push({
      title: 'User Management',
      description: 'Manage users, roles, and store assignments.',
      href: '/admin',
      icon: Users,
      color: 'from-slate-700 to-slate-800',
    })
  }

  return (
    <div className="min-h-full">
      <div className="p-6 md:p-8 max-w-6xl mx-auto">
        <div className="mb-10">
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
            Welcome back, {user.name.split(' ')[0]}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            {APP_NAME_SHORT} · {activeStore?.name ?? 'All stores'}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {cards.map((card) => {
            const Icon = card.icon
            return (
              <Link
                key={card.href}
                href={card.href}
                className="group relative overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800/50 shadow-sm hover:shadow-md hover:border-slate-300 dark:hover:border-slate-500 transition-all duration-200"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${card.color} opacity-0 group-hover:opacity-5 transition-opacity`} />
                <div className="relative p-6">
                  <div className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${card.color} text-white mb-4`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">{card.title}</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">{card.description}</p>
                  <span className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--brand-navy)] dark:text-blue-300 group-hover:gap-2 transition-all">
                    Open
                    <ArrowRight className="w-4 h-4" />
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
