'use client'

import { useDailyOps } from '@/lib/daily-ops/DailyOpsContext'
import { formatCurrency, formatPercent, formatUpt } from '@/lib/daily-ops/formatters'

export function MetricsGrid() {
  const { retailData } = useDailyOps()

  if (!retailData) {
    return (
      <div className="rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50 p-4 text-sm text-slate-500 dark:text-slate-400">
        Select a store and date to load metrics.
      </div>
    )
  }

  const rows = [
    { label: 'Net Revenue Budget', value: formatCurrency(retailData.netRevBudget) },
    { label: 'Net Revenue LY', value: formatCurrency(retailData.netRevLY) },
    { label: 'Orders Budget', value: retailData.ordersBudget != null ? String(retailData.ordersBudget) : '--' },
    { label: 'AOV Budget', value: formatCurrency(retailData.aovBudget) },
    { label: 'UPT Budget', value: formatUpt(retailData.uptBudget) },
    { label: 'CVR Budget', value: formatPercent(retailData.cvrBudget) },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {rows.map(({ label, value }) => (
        <div key={label} className="flex justify-between items-center rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2">
          <span className="text-sm text-slate-600 dark:text-slate-300">{label}</span>
          <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{value}</span>
        </div>
      ))}
    </div>
  )
}
