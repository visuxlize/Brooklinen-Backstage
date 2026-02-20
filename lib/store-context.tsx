'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { STORE_CONFIG } from '@/lib/stores'

type StoreContextType = {
  activeStoreId: number
  setActiveStoreId: (id: number) => void
}

const StoreContext = createContext<StoreContextType | null>(null)

export function StoreProvider({
  children,
  defaultStoreId,
}: {
  children: ReactNode
  defaultStoreId: number
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [activeStoreId, setActiveStoreIdState] = useState<number>(() => {
    const param = searchParams.get('store')
    if (param) {
      const id = parseInt(param)
      if (STORE_CONFIG.find((s) => s.id === id)) return id
    }
    return defaultStoreId
  })

  const setActiveStoreId = (id: number) => {
    setActiveStoreIdState(id)
    const params = new URLSearchParams(searchParams.toString())
    params.set('store', String(id))
    router.push(`${pathname}?${params.toString()}`)
  }

  useEffect(() => {
    const param = searchParams.get('store')
    if (param) {
      const id = parseInt(param)
      if (STORE_CONFIG.find((s) => s.id === id)) {
        setActiveStoreIdState(id)
      }
    }
  }, [searchParams])

  return (
    <StoreContext.Provider value={{ activeStoreId, setActiveStoreId }}>
      {children}
    </StoreContext.Provider>
  )
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used within StoreProvider')
  return ctx
}
