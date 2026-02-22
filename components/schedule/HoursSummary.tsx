import { parsePaidHours } from '@/lib/shiftUtils'

const DAY_KEYS = [0, 1, 2, 3, 4, 5, 6]

interface HoursSummaryProps {
  employees: string[]
  data: Record<string, Record<number, string>>
  storeColor: string
  budgetHoursDaily?: number[]
  trendingHoursDaily?: number[]
  peakWindowByDay?: string[]
  allowableHours?: number | null
}

export function HoursSummary({
  employees,
  data,
  storeColor,
  budgetHoursDaily,
  trendingHoursDaily,
  peakWindowByDay,
  allowableHours,
}: HoursSummaryProps) {
  const dayTotals = DAY_KEYS.map((day) =>
    employees.reduce((sum, emp) => sum + parsePaidHours(data[emp]?.[day] ?? ''), 0)
  )
  const grandTotal = dayTotals.reduce((a, b) => a + b, 0)
  const budgetWtd = budgetHoursDaily?.reduce((a, b) => a + b, 0) ?? 0
  const trendingWtd = trendingHoursDaily?.reduce((a, b) => a + b, 0) ?? 0
  const isOverBudget = allowableHours != null && grandTotal > allowableHours

  return (
    <>
      {budgetHoursDaily != null && (
        <tr className="bg-slate-100 dark:bg-slate-700/60 border-b border-slate-200 dark:border-slate-600">
          <td className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200">Budget hours</td>
          <td className="px-2 py-2 text-center text-sm font-bold text-slate-800 dark:text-slate-100 w-14">
            {budgetWtd > 0 ? `${budgetWtd}h` : '—'}
          </td>
          {DAY_KEYS.map((day) => (
            <td key={day} className="px-2 py-2 text-center text-sm font-medium text-slate-800 dark:text-slate-100">
              {budgetHoursDaily[day] != null && budgetHoursDaily[day] > 0 ? `${budgetHoursDaily[day]}h` : '—'}
            </td>
          ))}
        </tr>
      )}
      {trendingHoursDaily != null && (
        <tr className="bg-slate-50 dark:bg-slate-700/40 border-b border-slate-200 dark:border-slate-600">
          <td className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200">Trending hours</td>
          <td className="px-2 py-2 text-center text-sm font-bold text-slate-800 dark:text-slate-100 w-14">
            {trendingWtd > 0 ? `${trendingWtd}h` : '—'}
          </td>
          {DAY_KEYS.map((day) => (
            <td key={day} className="px-2 py-2 text-center text-sm font-medium text-slate-800 dark:text-slate-100">
              {trendingHoursDaily[day] != null && trendingHoursDaily[day] > 0 ? (
                <span>
                  {trendingHoursDaily[day]}h
                  {peakWindowByDay?.[day] && peakWindowByDay[day] !== '—' && (
                    <span className="block text-xs font-normal text-slate-500 dark:text-slate-400">
                      Peak ({peakWindowByDay[day]})
                    </span>
                  )}
                </span>
              ) : (
                '—'
              )}
            </td>
          ))}
        </tr>
      )}
      <tr className="bg-[var(--brand-navy)] text-white border-t-0">
        <td className="px-4 py-3 rounded-bl-lg">
          <span className="text-xs font-semibold uppercase tracking-widest text-white/80">Actual Hours</span>
        </td>
        <td
          className={`px-2 py-3 text-center w-14 ${isOverBudget ? 'bg-red-600 dark:bg-red-700' : ''}`}
        >
          <span className="text-sm font-extrabold text-white">
            {grandTotal > 0 ? `${grandTotal}h` : '0h'}
          </span>
        </td>
        {DAY_KEYS.map((day) => (
          <td key={day} className="px-2 py-3 text-center">
            <span className="text-sm font-bold text-white">
              {dayTotals[day] > 0 ? `${dayTotals[day]}h` : '—'}
            </span>
          </td>
        ))}
      </tr>
    </>
  )
}
