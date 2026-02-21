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

/** Returns Tailwind class for +/- value (green positive, red negative, gray zero). */
export function getPlusMinusColor(value: string | null): string {
  if (!value || value === '0') return 'text-slate-500 dark:text-slate-400'
  return value.startsWith('+') ? 'text-green-600 dark:text-green-400 font-medium' : 'text-red-600 dark:text-red-400 font-medium'
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

/** UPT stays as decimal (e.g. 2.3). */
export function formatUpt(value: number | null | undefined): string {
  if (value === null || value === undefined) return '--'
  return String(value)
}
