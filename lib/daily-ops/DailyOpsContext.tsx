'use client'

import { createContext, useCallback, useContext, useMemo, useState, useEffect } from 'react'
import type { RetailDataRecord, EmployeeSlot, DailyOpsActuals, WakeupLinks, RecapNotes } from './types'
import { EMPTY_ACTUALS, EMPTY_SLOTS, EMPTY_WAKEUP_LINKS, EMPTY_RECAP_NOTES } from './types'
import { allowedStoreIds as getAllowedStoreIds } from '@/lib/roles'

const ALL_STORE_IDS = [101, 102, 103, 104, 105, 107, 108, 109]

export interface DailyOpsUser {
  role: string
  storeId: number | null
}

interface DailyOpsState {
  selectedStore: string | null
  selectedDate: string | null
  retailData: RetailDataRecord | null
  employees: EmployeeSlot[]
  actuals: DailyOpsActuals
  runningWtd: string
  runningMtd: string
  runningQtd: string
  wakeupLinks: WakeupLinks
  recapWeather: string
  recapInStoreEvent: string
  recapNotes: RecapNotes
}

interface DailyOpsContextValue extends DailyOpsState {
  currentUser: DailyOpsUser | null
  allowedStoreIds: number[]
  setSelectedStore: (store: string | null) => void
  setSelectedDate: (date: string | null) => void
  setRetailData: (data: RetailDataRecord | null) => void
  setEmployeeSlot: (index: number, slot: Partial<EmployeeSlot>) => void
  setActual: (key: keyof DailyOpsActuals, value: number | null) => void
  setRunningWtd: (v: string) => void
  setRunningMtd: (v: string) => void
  setRunningQtd: (v: string) => void
  setWakeupLinks: (key: keyof WakeupLinks, value: { url: string; label: string }) => void
  setRecapWeather: (v: string) => void
  setRecapInStoreEvent: (v: string) => void
  setRecapNote: (key: keyof RecapNotes, value: string) => void
  activeEmployeeCount: number
  netRevBudget: number | null
}

const defaultState: DailyOpsState = {
  selectedStore: null,
  selectedDate: null,
  retailData: null,
  employees: [...EMPTY_SLOTS],
  actuals: { ...EMPTY_ACTUALS },
  runningWtd: '',
  runningMtd: '',
  runningQtd: '',
  wakeupLinks: { ...EMPTY_WAKEUP_LINKS },
  recapWeather: '',
  recapInStoreEvent: '',
  recapNotes: { ...EMPTY_RECAP_NOTES },
}

const DailyOpsContext = createContext<DailyOpsContextValue | null>(null)

interface DailyOpsProviderProps {
  children: React.ReactNode
  currentUser?: DailyOpsUser | null
}

export function DailyOpsProvider({ children, currentUser = null }: DailyOpsProviderProps) {
  const [state, setState] = useState<DailyOpsState>(defaultState)

  const allowedStoreIds = useMemo(() => {
    if (!currentUser) return []
    return getAllowedStoreIds(currentUser, ALL_STORE_IDS)
  }, [currentUser])

  useEffect(() => {
    if (!currentUser || allowedStoreIds.length === 0) return
    setState((s) => {
      if (s.selectedStore != null) return s
      const defaultId = allowedStoreIds[0] ?? currentUser.storeId
      return { ...s, selectedStore: defaultId != null ? String(defaultId) : null }
    })
  }, [currentUser, allowedStoreIds])

  const setSelectedStore = useCallback((selectedStore: string | null) => {
    setState((s) => ({ ...s, selectedStore, retailData: null }))
  }, [])

  const setSelectedDate = useCallback((selectedDate: string | null) => {
    setState((s) => ({ ...s, selectedDate, retailData: null }))
  }, [])

  const setRetailData = useCallback((retailData: RetailDataRecord | null) => {
    setState((s) => ({ ...s, retailData }))
  }, [])

  const setEmployeeSlot = useCallback((index: number, slot: Partial<EmployeeSlot>) => {
    if (index < 0 || index >= 9) return
    setState((s) => {
      const next = [...s.employees]
      next[index] = { ...next[index], ...slot }
      return { ...s, employees: next }
    })
  }, [])

  const setActual = useCallback((key: keyof DailyOpsActuals, value: number | null) => {
    setState((s) => ({ ...s, actuals: { ...s.actuals, [key]: value } }))
  }, [])

  const setRunningWtd = useCallback((v: string) => setState((s) => ({ ...s, runningWtd: v })), [])
  const setRunningMtd = useCallback((v: string) => setState((s) => ({ ...s, runningMtd: v })), [])
  const setRunningQtd = useCallback((v: string) => setState((s) => ({ ...s, runningQtd: v })), [])
  const setWakeupLinks = useCallback((key: keyof WakeupLinks, value: { url: string; label: string }) => {
    setState((s) => ({ ...s, wakeupLinks: { ...s.wakeupLinks, [key]: value } }))
  }, [])
  const setRecapWeather = useCallback((v: string) => setState((s) => ({ ...s, recapWeather: v })), [])
  const setRecapInStoreEvent = useCallback((v: string) => setState((s) => ({ ...s, recapInStoreEvent: v })), [])
  const setRecapNote = useCallback((key: keyof RecapNotes, value: string) => {
    setState((s) => ({ ...s, recapNotes: { ...s.recapNotes, [key]: value } }))
  }, [])

  const activeEmployeeCount = useMemo(() => {
    return state.employees.filter((e) => e.name != null && String(e.name).trim() !== '').length
  }, [state.employees])

  const netRevBudget = state.retailData?.netRevBudget ?? null

  const value: DailyOpsContextValue = useMemo(
    () => ({
      ...state,
      currentUser,
      allowedStoreIds,
      setSelectedStore,
      setSelectedDate,
      setRetailData,
      setEmployeeSlot,
      setActual,
      setRunningWtd,
      setRunningMtd,
      setRunningQtd,
      setWakeupLinks,
      setRecapWeather,
      setRecapInStoreEvent,
      setRecapNote,
      activeEmployeeCount,
      netRevBudget,
    }),
    [
      state,
      currentUser,
      allowedStoreIds,
      setSelectedStore,
      setSelectedDate,
      setRetailData,
      setEmployeeSlot,
      setActual,
      setRunningWtd,
      setRunningMtd,
      setRunningQtd,
      setWakeupLinks,
      setRecapWeather,
      setRecapInStoreEvent,
      setRecapNote,
      activeEmployeeCount,
      netRevBudget,
    ]
  )

  return <DailyOpsContext.Provider value={value}>{children}</DailyOpsContext.Provider>
}

export function useDailyOps(): DailyOpsContextValue {
  const ctx = useContext(DailyOpsContext)
  if (!ctx) throw new Error('useDailyOps must be used within DailyOpsProvider')
  return ctx
}
