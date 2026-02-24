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

/** Pastel zone palette — soft tones for legend and grid blocks; use #1a1a1a for label text. */
export const SHIFT_ROLE_COLORS: Record<ShiftRole, string> = {
  Opening: '#FFF9C4',
  LOD: '#C8E6C9',
  'Floor Support': '#A5D6A7',
  Stockroom: '#E1BEE7',
  Visual: '#B3E5FC',
  Closing: '#FFCCBC',
  Lunch: '#CFD8DC',
  'Office Time': '#F0F4C3',
  Flex: '#B2EBF2',
  Sick: '#F8BBD0',
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
