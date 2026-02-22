'use client'

import { useDailyOps } from '@/lib/daily-ops/DailyOpsContext'
import { formatCurrency, formatUpt, formatConversionGoal, getRunningPercentInputBg } from '@/lib/daily-ops/formatters'

/**
 * KPI goals as clean cards: Budget, LY, Order Goal, AOV, UPT, Conversion, Running % WTD/MTD/QTD.
 * Running % fields are editable; + → light green, - → light red.
 */
export function WakeupMetricsPanel() {
  const { retailData, runningWtd, runningMtd, runningQtd, setRunningWtd, setRunningMtd, setRunningQtd } = useDailyOps()

  if (!retailData) {
    return (
      <div className="rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50 p-5 text-sm text-slate-500 dark:text-slate-400 shadow-sm">
        Select store and date to load metrics.
      </div>
    )
  }

  const cards = [
    { label: 'Budget', value: formatCurrency(retailData.netRevBudget) },
    { label: 'LY', value: formatCurrency(retailData.netRevLY) },
    { label: 'Order Goal', value: retailData.ordersBudget != null ? String(retailData.ordersBudget) : '--' },
    { label: 'AOV Goal', value: formatCurrency(retailData.aovBudget) },
    { label: 'UPT Goal', value: formatUpt(retailData.uptBudget) },
    { label: 'Conversion Goal', value: formatConversionGoal(retailData.cvrBudget) },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {cards.map(({ label, value }) => (
        <div
          key={label}
          className="rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800/80 p-4 shadow-sm transition-shadow hover:shadow"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1">{label}</p>
          <p className="text-lg font-semibold text-slate-900 dark:text-slate-100 tabular-nums">{value}</p>
        </div>
      ))}
      <div className="col-span-2 sm:col-span-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800/80 p-4 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-3">Running %</p>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">WTD</label>
            <input
              type="text"
              placeholder="--"
              value={runningWtd}
              onChange={(e) => setRunningWtd(e.target.value)}
              className={`w-full text-sm font-medium text-right px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 ${getRunningPercentInputBg(runningWtd)}`}
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">MTD</label>
            <input
              type="text"
              placeholder="--"
              value={runningMtd}
              onChange={(e) => setRunningMtd(e.target.value)}
              className={`w-full text-sm font-medium text-right px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 ${getRunningPercentInputBg(runningMtd)}`}
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">QTD</label>
            <input
              type="text"
              placeholder="--"
              value={runningQtd}
              onChange={(e) => setRunningQtd(e.target.value)}
              className={`w-full text-sm font-medium text-right px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 ${getRunningPercentInputBg(runningQtd)}`}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
