import { parsePaidHours, formatHours } from '@/lib/shiftUtils'

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
        <tr data-row="budget-hours" className="bg-slate-100 dark:bg-slate-700/60 border-b border-slate-200 dark:border-slate-600">
          <td className="px-5 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200">Budget hours</td>
          <td className="px-3 py-2.5 text-center text-sm font-bold text-slate-800 dark:text-slate-100 w-16 tabular-nums">
            {budgetWtd > 0 ? formatHours(budgetWtd) : '—'}
          </td>
          {DAY_KEYS.map((day) => (
            <td key={day} className="px-2.5 py-2.5 text-center text-sm font-medium text-slate-800 dark:text-slate-100 tabular-nums">
              {budgetHoursDaily[day] != null && budgetHoursDaily[day] > 0 ? formatHours(budgetHoursDaily[day]) : '—'}
            </td>
          ))}
        </tr>
      )}
      {trendingHoursDaily != null && (
        <tr data-row="trending-hours" className="bg-slate-50 dark:bg-slate-700/40 border-b border-slate-200 dark:border-slate-600">
          <td className="px-5 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200">Trending hours</td>
          <td className="px-3 py-2.5 text-center text-sm font-bold text-slate-800 dark:text-slate-100 w-16 tabular-nums">
            {trendingWtd > 0 ? formatHours(trendingWtd) : '—'}
          </td>
          {DAY_KEYS.map((day) => (
            <td key={day} className="px-2.5 py-2.5 text-center text-sm font-medium text-slate-800 dark:text-slate-100 tabular-nums">
              {trendingHoursDaily[day] != null && trendingHoursDaily[day] > 0 ? formatHours(trendingHoursDaily[day]) : '—'}
            </td>
          ))}
        </tr>
      )}
      {peakWindowByDay != null && peakWindowByDay.some((w) => w && w !== '—') && (
        <tr data-row="power-hour" className="power-hour-row bg-gradient-to-r from-amber-500/15 to-orange-500/15 dark:from-amber-500/20 dark:to-orange-500/20 border-b-2 border-amber-400/30 dark:border-amber-400/40" style={{ backgroundColor: '#fffbf5' }}>
          <td className="px-5 py-3">
            <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5" style={{ color: '#92400e' }}>
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full" style={{ backgroundColor: 'rgba(245, 158, 11, 0.4)', color: '#f59e0b' }} aria-hidden>⚡</span>
              Power Hour
            </span>
            <span className="block text-[10px] font-normal mt-0.5 leading-relaxed" style={{ color: '#b45309' }}>Busiest window each day</span>
          </td>
          <td className="px-3 py-3 w-16 text-center text-xs font-medium" style={{ color: '#92400e' }}>—</td>
          {DAY_KEYS.map((day) => (
            <td key={day} className="px-2.5 py-3 text-center">
              <span className="text-xs font-semibold leading-normal" style={{ color: '#1a2332' }}>
                {peakWindowByDay[day] && peakWindowByDay[day] !== '—' ? peakWindowByDay[day] : '—'}
              </span>
            </td>
          ))}
        </tr>
      )}
      <tr data-row="actual-hours" className="actual-hours-row bg-[var(--brand-navy)] text-white border-t-0" style={{ backgroundColor: '#0e1f3d' }}>
        <td className="px-5 py-3.5 rounded-bl-lg">
          <span className="text-xs font-semibold uppercase tracking-widest text-white/80">Actual Hours</span>
        </td>
        <td
          className={`px-3 py-3.5 text-center w-16 ${isOverBudget ? 'bg-red-600 dark:bg-red-700' : ''}`}
          style={isOverBudget ? { backgroundColor: '#dd2626' } : undefined}
        >
          <span className="text-sm font-extrabold text-white tabular-nums">
            {grandTotal > 0 ? <>{grandTotal}<span className="ml-0.5 opacity-90">h</span></> : <>0<span className="ml-0.5 opacity-90">h</span></>}
          </span>
        </td>
        {DAY_KEYS.map((day) => (
          <td key={day} className="px-2.5 py-3.5 text-center">
            <span className="text-sm font-bold text-white tabular-nums">
              {dayTotals[day] > 0 ? <>{dayTotals[day]}<span className="ml-0.5 opacity-90">h</span></> : '—'}
            </span>
          </td>
        ))}
      </tr>
    </>
  )
}
