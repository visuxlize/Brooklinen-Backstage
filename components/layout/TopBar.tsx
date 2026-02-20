'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { Menu } from 'lucide-react'
import { STORE_CONFIG } from '@/lib/stores'
import { Avatar } from '@/components/ui/Avatar'
import { Chip } from '@/components/ui/Chip'
import { useStore } from '@/lib/store-context'

interface TopBarProps {
  currentUser: {
    name: string
    role: string
    storeId: number | null
  }
  onToggleSidebar: () => void
  pendingRtoCount?: number
}

type Tab = { label: string; href: string; badge?: number }

function buildTabs(role: string, storeId: number | null, pendingRtoCount: number, store: string): Tab[] {
  const storeParam = storeId ? `?store=${storeId}` : ''
  if (role === 'ops') {
    return [
      { label: 'Schedule', href: `/schedule${storeParam}` },
      { label: 'Traffic', href: `/traffic${storeParam}` },
      { label: 'RTO', href: `/rto${storeParam}`, badge: pendingRtoCount },
      { label: 'Admin', href: '/admin' },
    ]
  }
  if (role === 'leader') {
    return [
      { label: 'Schedule', href: `/schedule${storeParam}` },
      { label: 'Traffic', href: `/traffic${storeParam}` },
      { label: 'RTO', href: `/rto${storeParam}`, badge: pendingRtoCount },
    ]
  }
  return [
    { label: 'Schedule', href: `/schedule${storeParam}` },
    { label: 'My Requests', href: `/rto/submit${storeParam}` },
  ]
}

export function TopBar({ currentUser, onToggleSidebar, pendingRtoCount = 0 }: TopBarProps) {
  const { activeStoreId } = useStore()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const activeStore = STORE_CONFIG.find((s) => s.id === activeStoreId)
  const tabs = buildTabs(currentUser.role, activeStoreId, pendingRtoCount, activeStore?.name ?? '')

  const isActive = (href: string) => {
    const path = href.split('?')[0]
    return pathname === path || pathname.startsWith(path + '/')
  }

  const firstName = currentUser.name.split(' ')[0]

  return (
    <header className="fixed top-0 right-0 left-0 z-20 bg-white border-b border-slate-200 flex items-center gap-3 px-4 h-14">
      <button
        onClick={onToggleSidebar}
        className="p-2 rounded-lg hover:bg-slate-100 transition-colors text-slate-600"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Store info */}
      {activeStore && (
        <div className="flex items-center gap-2">
          <span
            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: activeStore.color }}
          />
          <span className="font-bold text-slate-900 text-sm">{activeStore.name}</span>
          <span className="text-slate-400 text-sm hidden sm:inline">·</span>
          <span className="text-slate-500 text-sm hidden sm:inline">{activeStore.city}</span>
        </div>
      )}

      {/* Tab nav */}
      <nav className="flex-1 flex items-center gap-1 overflow-x-auto ml-2">
        {tabs.map((tab) => {
          const active = isActive(tab.href.split('?')[0])
          return (
            <Link
              key={tab.label}
              href={tab.href}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                active
                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {tab.label}
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className="bg-red-500 text-white text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center">
                  {tab.badge > 9 ? '9+' : tab.badge}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Right side */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {currentUser.role === 'associate' && (
          <Chip label="View Only" variant="amber" />
        )}
        <div className="flex items-center gap-2">
          <Avatar
            name={currentUser.name}
            size="sm"
            color={activeStore?.color ?? '#1B4B8A'}
          />
          <span className="text-sm font-medium text-slate-700 hidden sm:inline">{firstName}</span>
        </div>
      </div>
    </header>
  )
}
