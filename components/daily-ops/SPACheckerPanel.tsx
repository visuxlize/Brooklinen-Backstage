'use client'

import { useDailyOps } from '@/lib/daily-ops/DailyOpsContext'
import { formatCurrency } from '@/lib/daily-ops/formatters'

/**
 * SPA Checker: date and budget from Wakeup; # staff = count of filled slots;
 * each row = one Wakeup slot in order; SPA goal = budget / activeEmployeeCount (even split).
 */
export function SPACheckerPanel() {
  const { selectedDate, retailData, employees, activeEmployeeCount, netRevBudget } = useDailyOps()

  const spaGoal =
    netRevBudget != null && netRevBudget > 0 && activeEmployeeCount > 0
      ? netRevBudget / activeEmployeeCount
      : null

  if (!selectedDate) {
    return (
      <div className="text-sm text-slate-500 dark:text-slate-400">
        Select store and date in Morning Wakeup to see SPA Checker.
      </div>
    )
  }

  return (
    <div className="space-y-4 max-w-xl">
      <div className="flex flex-wrap gap-4 text-sm">
        <span>
          <strong className="text-slate-500 dark:text-slate-400">Date:</strong>{' '}
          <span className="text-slate-800 dark:text-slate-200">{selectedDate}</span>
        </span>
        <span>
          <strong className="text-slate-500 dark:text-slate-400">Budget:</strong>{' '}
          <span className="text-slate-800 dark:text-slate-200">{formatCurrency(netRevBudget)}</span>
        </span>
        <span>
          <strong className="text-slate-500 dark:text-slate-400"># Staff:</strong>{' '}
          <span className="text-slate-800 dark:text-slate-200">{activeEmployeeCount}</span>
        </span>
      </div>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-slate-200 dark:border-slate-600">
            <th className="text-left py-2 pr-4 text-slate-600 dark:text-slate-300 font-medium">Employee</th>
            <th className="text-right py-2 text-slate-600 dark:text-slate-300 font-medium">SPA Goal</th>
          </tr>
        </thead>
        <tbody>
          {employees.map((slot, i) => {
            const name = slot.name?.trim() || ''
            const displayGoal = name && spaGoal != null ? formatCurrency(spaGoal) : '--'
            return (
              <tr key={i} className="border-b border-slate-100 dark:border-slate-700">
                <td className="py-2 pr-4 text-slate-800 dark:text-slate-200">{name || '—'}</td>
                <td className="py-2 text-right font-medium text-slate-800 dark:text-slate-200">{displayGoal}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
