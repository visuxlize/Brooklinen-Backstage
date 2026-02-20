'use client'

import { useState, Suspense } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import { StoreProvider } from '@/lib/store-context'

interface AppLayoutClientProps {
  children: React.ReactNode
  currentUser: {
    id: string
    name: string
    email: string
    role: string
    storeId: number | null
  }
  pendingCounts: Record<number, number>
  pendingRtoCount: number
  defaultStoreId: number
}

export function AppLayoutClient({
  children,
  currentUser,
  pendingCounts,
  pendingRtoCount,
  defaultStoreId,
}: AppLayoutClientProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true)

  return (
    <StoreProvider defaultStoreId={defaultStoreId}>
      <Suspense>
        <Sidebar
          currentUser={currentUser}
          pendingCounts={pendingCounts}
          isOpen={sidebarOpen}
        />
        <TopBar
          currentUser={currentUser}
          onToggleSidebar={() => setSidebarOpen((v) => !v)}
          pendingRtoCount={pendingRtoCount}
        />
        <main
          className="transition-all duration-300 pt-14 min-h-screen bg-[var(--surface)]"
          style={{ marginLeft: sidebarOpen ? '256px' : '0' }}
        >
          {children}
        </main>
      </Suspense>
    </StoreProvider>
  )
}
