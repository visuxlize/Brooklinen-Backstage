'use client'

import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { RetailDataRecord, EmployeeSlot, DailyOpsActuals } from './types'
import { EMPTY_ACTUALS, EMPTY_SLOTS } from './types'

interface DailyOpsState {
  selectedStore: string | null
  selectedDate: string | null
  retailData: RetailDataRecord | null
  employees: EmployeeSlot[]
  actuals: DailyOpsActuals
}

interface DailyOpsContextValue extends DailyOpsState {
  setSelectedStore: (store: string | null) => void
  setSelectedDate: (date: string | null) => void
  setRetailData: (data: RetailDataRecord | null) => void
  setEmployeeSlot: (index: number, slot: Partial<EmployeeSlot>) => void
  setActual: (key: keyof DailyOpsActuals, value: number | null) => void
  /** Count of slots with a non-empty name (for SPA even-split). */
  activeEmployeeCount: number
  /** Net revenue budget from retailData (for SPA). */
  netRevBudget: number | null
}

const defaultState: DailyOpsState = {
  selectedStore: null,
  selectedDate: null,
  retailData: null,
  employees: [...EMPTY_SLOTS],
  actuals: { ...EMPTY_ACTUALS },
}

const DailyOpsContext = createContext<DailyOpsContextValue | null>(null)

export function DailyOpsProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<DailyOpsState>(defaultState)

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

  const activeEmployeeCount = useMemo(() => {
    return state.employees.filter((e) => e.name != null && String(e.name).trim() !== '').length
  }, [state.employees])

  const netRevBudget = state.retailData?.netRevBudget ?? null

  const value: DailyOpsContextValue = useMemo(
    () => ({
      ...state,
      setSelectedStore,
      setSelectedDate,
      setRetailData,
      setEmployeeSlot,
      setActual,
      activeEmployeeCount,
      netRevBudget,
    }),
    [
      state,
      setSelectedStore,
      setSelectedDate,
      setRetailData,
      setEmployeeSlot,
      setActual,
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
