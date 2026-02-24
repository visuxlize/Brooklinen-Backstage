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
  LOD: '#4CAF50',
  'Floor Support': '#388E3C',
  Visual: '#B3E5FC',
  Opening: '#FFF176',
  Stockroom: '#E1BEE7',
  Lunch: '#B0BEC5',
  Closing: '#f4c7c3',
  'Office Time': '#eef7e3',
  Flex: '#c9daf8',
  Sick: '#a64d79',
}

export interface EmployeeSlot {
  name: string | null
  role: string | null
  shift: string | null   // e.g. "10:30-7"
  meal: string | null    // e.g. "2:30-3"
  /** 15-min block index 0–52 (8:00 AM–9:00 PM) -> role key for zoning. 0=8:00, 1=8:15, ..., 52=9:00 PM. */
  quarterRoles: Record<number, string>
}

export interface DailyOpsActuals {
  netRevenue: number | null
  orders: number | null
  upt: number | null
  traffic: number | null
  returns: number | null
  /** AOV and CVR are computed (netRevenue/orders, orders/traffic), not stored */
}

export interface WakeupLinks {
  cashlog: { url: string; label: string }
  returns: { url: string; label: string }
}

export interface RecapNotes {
  overallSales: string
  traffic: string
  conversion: string
  promotionPerformance: string
  retailOpsAlerts: string
  storeClosingNotes: string
}

export interface DailyOpsState {
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

export const EMPTY_ACTUALS: DailyOpsActuals = {
  netRevenue: null,
  orders: null,
  upt: null,
  traffic: null,
  returns: null,
}

export const EMPTY_WAKEUP_LINKS: WakeupLinks = {
  cashlog: { url: '', label: 'Cashlog' },
  returns: { url: '', label: 'Returns Tracker' },
}

export const EMPTY_RECAP_NOTES: RecapNotes = {
  overallSales: '',
  traffic: '',
  conversion: '',
  promotionPerformance: '',
  retailOpsAlerts: '',
  storeClosingNotes: '',
}

export const EMPTY_SLOTS: EmployeeSlot[] = Array.from({ length: 9 }, () => ({
  name: null,
  role: null,
  shift: null,
  meal: null,
  quarterRoles: {},
}))
