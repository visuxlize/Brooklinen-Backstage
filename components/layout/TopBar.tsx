'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Menu, ChevronDown, User, LogOut } from 'lucide-react'
import { STORE_CONFIG } from '@/lib/stores'
import { Avatar } from '@/components/ui/Avatar'
import { Chip } from '@/components/ui/Chip'
import { BrooklinenLogo } from '@/components/ui/BrooklinenLogo'
import { useStore } from '@/lib/store-context'
import { RTO_SUBMIT_URL } from '@/lib/app-config'
import { useUserPreferencesStore, getInitials } from '@/lib/user-preferences-store'
import { createClient } from '@/lib/supabase/client'

interface TopBarProps {
  currentUser: {
    name: string
    role: string
    storeId: number | null
  }
  onToggleSidebar: () => void
  pendingRtoCount?: number
  sidebarOpen?: boolean
}

type Tab = { label: string; href: string; badge?: number; isRtoSubmit?: boolean }

function buildTabs(role: string, storeId: number | null, pendingRtoCount: number): Tab[] {
  const storeParam = storeId ? `?store=${storeId}` : ''
  if (role === 'ops' || role === 'area_manager' || role === 'store_leader' || role === 'leader') {
    return [
      { label: 'Dashboard', href: `/dashboard${storeParam}` },
      { label: 'Schedule', href: `/schedule${storeParam}` },
      { label: 'Daily Ops', href: `/daily-ops${storeParam}` },
      { label: 'Availability', href: `/availability${storeParam}` },
      { label: 'Traffic', href: `/traffic${storeParam}` },
      { label: 'RTO', href: `/rto${storeParam}`, badge: pendingRtoCount },
    ]
  }
  return [
    { label: 'Dashboard', href: `/dashboard${storeParam}` },
    { label: 'Schedule', href: `/schedule${storeParam}` },
    { label: 'My Requests', href: RTO_SUBMIT_URL, isRtoSubmit: true },
  ]
}

export function TopBar({ currentUser, onToggleSidebar, pendingRtoCount = 0, sidebarOpen = true }: TopBarProps) {
  const { activeStoreId } = useStore()
  const pathname = usePathname()
  const router = useRouter()
  const [avatarOpen, setAvatarOpen] = useState(false)
  const avatarRef = useRef<HTMLDivElement>(null)
  const { displayName, avatarUrl } = useUserPreferencesStore()
  const effectiveName = displayName?.trim() || currentUser.name
  const firstName = effectiveName.split(' ')[0]

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (avatarRef.current && !avatarRef.current.contains(e.target as Node)) setAvatarOpen(false)
    }
    if (avatarOpen) {
      document.addEventListener('click', onClickOutside)
      return () => document.removeEventListener('click', onClickOutside)
    }
  }, [avatarOpen])

  async function handleLogOut() {
    setAvatarOpen(false)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const activeStore = STORE_CONFIG.find((s) => s.id === activeStoreId)
  const tabs = buildTabs(currentUser.role, activeStoreId, pendingRtoCount)

  const isActive = (href: string) => {
    const path = href.split('?')[0]
    return pathname === path || pathname.startsWith(path + '/')
  }

  return (
    <header
      className="fixed top-0 right-0 z-20 border-b flex items-center gap-2 px-3 h-12 transition-[left] duration-300 bg-[var(--header-bg)] border-[var(--header-border)]"
      style={{ left: sidebarOpen ? '256px' : 0 }}
    >
      <button
        onClick={onToggleSidebar}
        className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 transition-colors text-slate-600 dark:text-slate-300"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Logo (compact) - visible on main app screens */}
      <div className="hidden sm:block flex-shrink-0">
        <BrooklinenLogo variant="navy" height={22} className="dark:hidden" />
        <BrooklinenLogo variant="white" height={22} className="hidden dark:block" />
      </div>

      {/* Store info - no longer clipped; bar starts after sidebar */}
      {activeStore && (
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ backgroundColor: activeStore.color }}
          />
          <span className="font-semibold text-slate-900 dark:text-slate-100 text-sm truncate">{activeStore.name}</span>
          <span className="text-slate-400 text-sm hidden md:inline">·</span>
          <span className="text-slate-500 dark:text-slate-400 text-sm truncate hidden md:inline">{activeStore.city}</span>
        </div>
      )}

      {/* Tab nav */}
      <nav className="flex-1 flex items-center gap-1 overflow-x-auto min-w-0">
        {tabs.map((tab) => {
          const active = !tab.isRtoSubmit && isActive(tab.href.split('?')[0])
          const buttonClass = `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
            active
              ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-200 border border-blue-200 dark:border-blue-800'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10'
          } ${tab.isRtoSubmit ? 'bg-[var(--brand-navy)] text-white hover:opacity-90 border-0' : ''}`
          if (tab.isRtoSubmit) {
            return (
              <a key={tab.label} href={tab.href} className={buttonClass}>
                {tab.label}
              </a>
            )
          }
          return (
            <Link key={tab.label} href={tab.href} className={buttonClass}>
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
        <div className="relative" ref={avatarRef}>
          <button
            type="button"
            onClick={() => setAvatarOpen((v) => !v)}
            className="flex items-center gap-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 p-1.5 transition-colors"
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={effectiveName}
                className="w-8 h-8 rounded-full object-cover"
              />
            ) : (
              <Avatar
                name={effectiveName}
                size="sm"
                color={activeStore?.color ?? '#1B4B8A'}
              />
            )}
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200 hidden sm:inline">{firstName}</span>
            <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${avatarOpen ? 'rotate-180' : ''}`} />
          </button>
          {avatarOpen && (
            <div className="absolute right-0 top-full mt-1 py-1 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-600 z-50">
              <Link
                href="/settings"
                onClick={() => setAvatarOpen(false)}
                className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50"
              >
                <User className="w-4 h-4" />
                My Settings
              </Link>
              <button
                type="button"
                onClick={handleLogOut}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50"
              >
                <LogOut className="w-4 h-4" />
                Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
