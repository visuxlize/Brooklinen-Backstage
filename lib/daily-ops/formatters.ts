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

/** Returns Tailwind background class for editable running %: + → light green, - → light red, else default. */
export function getRunningPercentInputBg(value: string): string {
  const t = value.trim()
  if (t.startsWith('+')) return 'bg-green-100 dark:bg-green-900/30 text-slate-900 dark:text-slate-100'
  if (t.startsWith('-')) return 'bg-red-100 dark:bg-red-900/30 text-slate-900 dark:text-slate-100'
  return 'bg-blue-50 dark:bg-blue-900/20 text-slate-900 dark:text-slate-100'
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
