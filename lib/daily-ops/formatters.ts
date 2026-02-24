/**
 * Formatting helpers for Daily Ops (Nightly Recap +/- %, currency, percent).
 */

/** Converts actual/budget ratio to +/- integer: 1.04 → "+4" | 0.87 → "-13" | 1.0 → "0" */
export function formatPlusMinus(actual: number | null, budget: number | null): string | null {
  if (actual == null || budget == null || budget === 0) return null
  const diff = Math.round((actual / budget) * 100 - 100)
  if (diff > 0) return `+${diff}`
  if (diff < 0) return `${diff}`
  return '0'
}

/** Same as formatPlusMinus but with "%" suffix for display (e.g. "+4%", "-13%"). */
export function formatPlusMinusPercent(actual: number | null, budget: number | null): string | null {
  const raw = formatPlusMinus(actual, budget)
  return raw == null ? null : `${raw}%`
}

/** Returns Tailwind class for +/- value (green positive, red negative, gray zero). */
export function getPlusMinusColor(value: string | null): string {
  if (!value || value === '0') return 'text-slate-500 dark:text-slate-400'
  return value.startsWith('+') ? 'text-green-600 dark:text-green-400 font-medium' : 'text-red-600 dark:text-red-400 font-medium'
}

/**
 * Parses user input for Running % (WTD/MTD/QTD). Strips "%" and non-digits, clamps 0–999.
 * Returns stored value: "" or "0".."999".
 */
export function parseRunningPercentInput(raw: string): string {
  const digits = raw.replace(/%/g, '').replace(/\D/g, '')
  if (digits === '') return ''
  const n = Math.min(999, Math.max(0, parseInt(digits, 10) || 0))
  return String(n)
}

/**
 * Formats stored Running % value for display. Adds +/- prefix from value vs 100:
 * under 100 → "-93%"; exactly 100 → "100%"; over 100 → "+101%".
 */
export function formatRunningPercentDisplay(stored: string): string {
  const digits = stored.replace(/\D/g, '')
  if (digits === '') return ''
  const n = Math.min(999, Math.max(0, parseInt(digits, 10) || 0))
  if (n < 100) return `-${n}%`
  if (n === 100) return '100%'
  return `+${n}%`
}

/** Pastel background hex for Running % inputs: under 100 = rose, 100 = gray, over 100 = green. */
export const RUNNING_PERCENT_BG = {
  under: '#FFE4E4',
  exact: '#F5F5F5',
  over: '#E8F5E9',
} as const

/** Returns inline style for Running % input background and text (pastel, no saturated colors). */
export function getRunningPercentInputStyle(stored: string): { backgroundColor: string; color: string } {
  const digits = stored.replace(/\D/g, '')
  const n = digits === '' ? 100 : parseInt(digits, 10) || 100
  const color = '#1a1a1a'
  if (n < 100) return { backgroundColor: RUNNING_PERCENT_BG.under, color }
  if (n === 100) return { backgroundColor: RUNNING_PERCENT_BG.exact, color }
  return { backgroundColor: RUNNING_PERCENT_BG.over, color }
}

export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) return '--'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

/** Percentage display from decimal (e.g. 0.125 → "12.5%"). */
export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined) return '--'
  return `${(value * 100).toFixed(1)}%`
}

/** Conversion goal: round to whole percent (e.g. 0.359 → "36%"). */
export function formatConversionGoal(value: number | null | undefined): string {
  if (value === null || value === undefined) return '--'
  const pct = Math.round(value * 100)
  return `${pct}%`
}

/** UPT as one decimal (e.g. 2.1567 → "2.2"). */
export function formatUpt(value: number | null | undefined): string {
  if (value === null || value === undefined) return '--'
  return Number(value).toFixed(1)
}
