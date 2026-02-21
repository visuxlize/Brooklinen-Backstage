/**
 * Types for Daily Ops module (Morning Wakeup, Nightly Recap, SPA Checker).
 */

export interface RetailDataRecord {
  store: string
  date: string
  netRevBudget: number | null
  netRevLY: number | null
  ordersBudget: number | null
  ordersLY: number | null
  aovBudget: number | null
  aovLY: number | null
  uptBudget: number | null
  uptLY: number | null
  cvrBudget: number | null
  cvrLY: number | null
  trafficBudget: number | null
}

export type ShiftRole =
  | 'Opening'
  | 'LOD'
  | 'Floor Support'
  | 'Stockroom'
  | 'Visual'
  | 'Closing'
  | 'Lunch'
  | 'Office Time'
  | 'Flex'
  | 'Sick'

export const SHIFT_ROLES: ShiftRole[] = [
  'Opening',
  'LOD',
  'Floor Support',
  'Stockroom',
  'Visual',
  'Closing',
  'Lunch',
  'Office Time',
  'Flex',
  'Sick',
]

export const SHIFT_ROLE_COLORS: Record<ShiftRole, string> = {
  Opening: '#fce8b2',
  LOD: '#b7e1cd',
  'Floor Support': '#8bc34a',
  Stockroom: '#e8e7fc',
  Visual: '#e0f7fa',
  Closing: '#f4c7c3',
  Lunch: '#bdbdbd',
  'Office Time': '#eef7e3',
  Flex: '#c9daf8',
  Sick: '#a64d79',
}

export interface EmployeeSlot {
  name: string | null
  role: string | null
}

export interface DailyOpsActuals {
  netRevenue: number | null
  orders: number | null
  upt: number | null
  aov: number | null
  traffic: number | null
  cvr: number | null
}

export interface DailyOpsState {
  selectedStore: string | null
  selectedDate: string | null
  retailData: RetailDataRecord | null
  employees: EmployeeSlot[]
  actuals: DailyOpsActuals
}

export const EMPTY_ACTUALS: DailyOpsActuals = {
  netRevenue: null,
  orders: null,
  upt: null,
  aov: null,
  traffic: null,
  cvr: null,
}

export const EMPTY_SLOTS: EmployeeSlot[] = Array.from({ length: 9 }, () => ({ name: null, role: null }))
