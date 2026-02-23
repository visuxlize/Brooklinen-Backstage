'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LogOut, Search, Users, Sun, Moon, Mail } from 'lucide-react'
import { BrooklinenLogo } from '@/components/ui/BrooklinenLogo'
import { STORE_CONFIG } from '@/lib/stores'
import { ROLE_LABELS, normalizeRole } from '@/lib/roles'
import { APP_NAME_SHORT } from '@/lib/app-config'
import { Avatar } from '@/components/ui/Avatar'
import { useStore } from '@/lib/store-context'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useTheme } from '@/components/theme/ThemeProvider'

interface SidebarProps {
  currentUser: {
    name: string
    email: string
    role: string
    storeId: number | null
  }
  pendingCounts?: Record<number, number>
  isOpen: boolean
}

export function Sidebar({ currentUser, pendingCounts = {}, isOpen }: SidebarProps) {
  const router = useRouter()
  const { activeStoreId, setActiveStoreId } = useStore()
  const { theme, toggleTheme } = useTheme()
  const [search, setSearch] = useState('')
  const pathname = usePathname()

  const isFullControl = currentUser.role === 'ops' || currentUser.role === 'area_manager'
  const canAccessAdmin = isFullControl || currentUser.role === 'store_leader' || currentUser.role === 'leader'

  const visibleStores = isFullControl
    ? STORE_CONFIG.filter((s) =>
        search
          ? s.name.toLowerCase().includes(search.toLowerCase()) ||
            s.city.toLowerCase().includes(search.toLowerCase())
          : true
      )
    : STORE_CONFIG.filter((s) => s.id === currentUser.storeId)

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const activeStore = STORE_CONFIG.find((s) => s.id === activeStoreId)

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-30 flex flex-col transition-all duration-300 ${
        isOpen ? 'w-64' : 'w-0 overflow-hidden'
      }`}
      style={{ backgroundColor: 'var(--sidebar-bg)' }}
    >
      <div className="flex flex-col h-full w-64">
        {/* Header */}
        <div className="p-5 border-b border-white/10">
          <BrooklinenLogo variant="white" height={28} className="mb-1" />
          <div className="text-xs font-semibold uppercase tracking-widest text-white/60">{APP_NAME_SHORT}</div>
        </div>

        {/* User info */}
        <div className="px-5 py-4 border-b border-white/10 flex items-center gap-3">
          <Avatar name={currentUser.name} size="sm" color={activeStore?.color ?? '#1B4B8A'} />
          <div className="min-w-0">
            <div className="text-sm font-semibold text-white truncate">{currentUser.name}</div>
            <div className="text-xs text-slate-400">{ROLE_LABELS[normalizeRole(currentUser.role)] ?? currentUser.role}</div>
          </div>
        </div>

        {/* Search (ops only) */}
        {isFullControl && (
          <div className="px-4 py-3 border-b border-white/10">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search stores..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-white/10 text-white placeholder-slate-400 text-xs rounded-lg pl-8 pr-3 py-2 focus:outline-none focus:ring-1 focus:ring-white/30 border border-white/10"
              />
            </div>
          </div>
        )}

        {/* Store list */}
        <nav className="flex-1 overflow-y-auto py-2">
          <div className="px-4 py-2">
            <span className="text-xs font-semibold uppercase tracking-widest text-slate-500">Stores</span>
          </div>
          {visibleStores.map((store) => {
            const isActive = store.id === activeStoreId
            const pending = pendingCounts[store.id] ?? 0
            return (
              <button
                key={store.id}
                onClick={() => setActiveStoreId(store.id)}
                className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-colors ${
                  isActive ? 'bg-white/10' : 'hover:bg-white/5'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full flex-shrink-0 transition-all ${
                    isActive ? 'shadow-lg scale-125' : ''
                  }`}
                  style={{ backgroundColor: store.color }}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-white truncate">{store.name}</div>
                  <div className="text-xs text-slate-400 truncate">{store.city}</div>
                </div>
                {isFullControl && pending > 0 && (
                  <span className="bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">
                    {pending > 9 ? '9+' : pending}
                  </span>
                )}
              </button>
            )
          })}
        </nav>

        {/* User Management + Email templates (OPS, Area Manager, Store Leader) */}
        {canAccessAdmin && (
          <div className="px-4 py-2 border-t border-white/10">
            <span className="text-xs font-semibold uppercase tracking-widest text-slate-500 block px-4 py-2">Management</span>
            <Link
              href="/admin"
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                pathname === '/admin' ? 'bg-white/10' : 'hover:bg-white/5'
              }`}
            >
              <Users className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <span className="text-sm font-medium text-white">User Management</span>
            </Link>
            <Link
              href="/email-preview"
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                pathname === '/email-preview' ? 'bg-white/10' : 'hover:bg-white/5'
              }`}
            >
              <Mail className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <span className="text-sm font-medium text-white">Email templates</span>
            </Link>
          </div>
        )}

        {/* Theme toggle */}
        <div className="px-4 py-2 border-t border-white/10">
          <button
            type="button"
            onClick={toggleTheme}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-white/20 text-white/80 hover:bg-white/10 transition-colors text-sm font-medium"
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            {theme === 'dark' ? 'Light mode' : 'Dark mode'}
          </button>
        </div>

        {/* Sign out */}
        <div className="p-4 border-t border-white/10">
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/20 text-white/70 hover:bg-white/10 hover:text-white transition-colors text-sm font-medium"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </div>
    </aside>
  )
}
