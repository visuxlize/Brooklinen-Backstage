'use client'

import { useDailyOps } from '@/lib/daily-ops/DailyOpsContext'
import { useRetailDataLookup } from '@/lib/daily-ops/useRetailDataLookup'
import { MetricsGrid } from './MetricsGrid'
import { EmployeeSlots } from './EmployeeSlots'
import { STORE_CONFIG } from '@/lib/stores'
import { format } from 'date-fns'

export function WakeupPanel() {
  const { selectedStore, selectedDate, setSelectedStore, setSelectedDate, retailData } = useDailyOps()
  useRetailDataLookup()

  const today = format(new Date(), 'yyyy-MM-dd')

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex flex-wrap items-center gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Store</label>
          <select
            value={selectedStore ?? ''}
            onChange={(e) => setSelectedStore(e.target.value || null)}
            className="px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 min-w-[180px]"
          >
            <option value="">— Select store —</option>
            {STORE_CONFIG.map((s) => (
              <option key={s.id} value={String(s.id)}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Date</label>
          <input
            type="date"
            value={selectedDate ?? ''}
            onChange={(e) => setSelectedDate(e.target.value || null)}
            className="px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
          />
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Metrics (auto from retail data)</h3>
        {selectedStore && selectedDate && !retailData && (
          <p className="text-sm text-amber-600 dark:text-amber-400 mb-2">No data found for this date.</p>
        )}
        <MetricsGrid />
      </div>

      <div>
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Schedule — Employees on floor today (up to 9 slots)</h3>
        <EmployeeSlots />
      </div>
    </div>
  )
}
