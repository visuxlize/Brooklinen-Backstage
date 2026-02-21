'use client'

import { useDailyOps } from '@/lib/daily-ops/DailyOpsContext'
import {
  formatCurrency,
  formatPercent,
  formatUpt,
  formatPlusMinus,
  getPlusMinusColor,
} from '@/lib/daily-ops/formatters'
import { STORE_CONFIG } from '@/lib/stores'

const COLS = [
  { key: 'netRevenue' as const, label: 'Net Rev', format: formatCurrency, isPercent: false },
  { key: 'orders' as const, label: 'Orders', format: (v: number | null) => (v != null ? String(Math.round(v)) : '--'), isPercent: false },
  { key: 'upt' as const, label: 'UPT', format: formatUpt, isPercent: false },
  { key: 'aov' as const, label: 'AOV', format: formatCurrency, isPercent: false },
  { key: 'traffic' as const, label: 'Traffic', format: formatCurrency, isPercent: false },
  { key: 'cvr' as const, label: 'CVR', format: (v: number | null) => formatPercent(v), isPercent: true },
]

/** Budget/LY from retailData; Actual from context; % = (actual/budget*100)-100, +/- integer. */
export function NightlyRecapPanel() {
  const { selectedStore, selectedDate, retailData, actuals, setActual } = useDailyOps()

  const budgetValues = retailData
    ? {
        netRevenue: retailData.netRevBudget,
        orders: retailData.ordersBudget,
        upt: retailData.uptBudget,
        aov: retailData.aovBudget,
        traffic: retailData.trafficBudget,
        cvr: retailData.cvrBudget,
      }
    : null
  const lyValues = retailData
    ? {
        netRevenue: retailData.netRevLY,
        orders: retailData.ordersLY,
        upt: retailData.uptLY,
        aov: retailData.aovLY,
        traffic: null as number | null,
        cvr: retailData.cvrLY,
      }
    : null

  if (!selectedStore || !selectedDate) {
    return (
      <div className="text-sm text-slate-500 dark:text-slate-400">
        Select store and date in Morning Wakeup to see Nightly Recap.
      </div>
    )
  }

  return (
    <div className="space-y-4 max-w-4xl overflow-x-auto">
      <p className="text-sm text-slate-600 dark:text-slate-300">
        Store: <strong>{STORE_CONFIG.find((s) => String(s.id) === selectedStore)?.name ?? selectedStore}</strong>
        {' · '}
        Date: <strong>{selectedDate}</strong>
      </p>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-slate-200 dark:border-slate-600">
            <th className="text-left py-2 pr-4 text-slate-500 dark:text-slate-400 font-medium w-14"></th>
            {COLS.map((c) => (
              <th key={c.key} className="text-center py-2 px-2 text-slate-600 dark:text-slate-300 font-medium">
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-slate-100 dark:border-slate-700">
            <td className="py-2 pr-4 font-medium text-slate-600 dark:text-slate-300">Bgt</td>
            {COLS.map((c) => {
              const val = budgetValues?.[c.key] ?? null
              return (
                <td key={c.key} className="text-center py-1 px-2 text-slate-700 dark:text-slate-200">
                  {c.format(val)}
                </td>
              )
            })}
          </tr>
          <tr className="border-b border-slate-100 dark:border-slate-700">
            <td className="py-2 pr-4 font-medium text-slate-600 dark:text-slate-300">LY</td>
            {COLS.map((c) => {
              const val = lyValues?.[c.key] ?? null
              return (
                <td key={c.key} className="text-center py-1 px-2 text-slate-600 dark:text-slate-400">
                  {c.key === 'traffic' ? '--' : c.format(val)}
                </td>
              )
            })}
          </tr>
          <tr className="border-b border-slate-200 dark:border-slate-600">
            <td className="py-2 pr-4 font-medium text-slate-600 dark:text-slate-300">Act</td>
            {COLS.map((c) => (
              <td key={c.key} className="text-center py-1 px-2">
                <input
                  type="number"
                  step={c.key === 'cvr' ? 0.1 : 1}
                  placeholder="—"
                  value={actuals[c.key] ?? ''}
                  onChange={(e) => {
                    const raw = e.target.value
                    if (raw === '') {
                      setActual(c.key, null)
                      return
                    }
                    const n = Number(raw)
                    if (Number.isNaN(n)) return
                    // CVR: if user types 12 meaning 12%, store as 0.12
                    if (c.key === 'cvr' && n > 1) setActual(c.key, n / 100)
                    else setActual(c.key, n)
                  }}
                  className="w-full max-w-[100px] mx-auto px-2 py-1 text-center text-sm border border-slate-200 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                />
              </td>
            ))}
          </tr>
          <tr>
            <td className="py-2 pr-4 font-medium text-slate-600 dark:text-slate-300">%</td>
            {COLS.map((c) => {
              const budget = budgetValues?.[c.key] ?? null
              const actual = actuals[c.key] ?? null
              const pct = formatPlusMinus(actual, budget)
              return (
                <td key={c.key} className={`text-center py-1 px-2 ${getPlusMinusColor(pct)}`}>
                  {pct ?? '--'}
                </td>
              )
            })}
          </tr>
        </tbody>
      </table>
    </div>
  )
}
