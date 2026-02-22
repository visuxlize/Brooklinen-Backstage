'use client'

import { useState, useEffect } from 'react'
import { useDailyOps } from '@/lib/daily-ops/DailyOpsContext'
import { useRetailDataLookup } from '@/lib/daily-ops/useRetailDataLookup'
import { WakeupMetricsPanel } from './WakeupMetricsPanel'
import { ZoningChart } from './ZoningChart'
import { STORE_CONFIG } from '@/lib/stores'

export function WakeupPanel() {
  const {
    selectedStore,
    selectedDate,
    setSelectedStore,
    setSelectedDate,
    retailData,
    allowedStoreIds,
    wakeupLinks,
    setWakeupLinks,
  } = useDailyOps()
  useRetailDataLookup()

  const [promotionsFocuses, setPromotionsFocuses] = useState('')
  const [productUpdate, setProductUpdate] = useState('')
  const [staffRecognition, setStaffRecognition] = useState('')
  const [tasks, setTasks] = useState('')

  const stores = STORE_CONFIG.filter((s) => allowedStoreIds.length === 0 || allowedStoreIds.includes(s.id))
  const selectedStoreName = selectedStore ? stores.find((s) => String(s.id) === selectedStore)?.name : null

  useEffect(() => {
    if (stores.length === 1 && !selectedStore) setSelectedStore(String(stores[0].id))
  }, [stores, selectedStore, setSelectedStore])

  return (
    <div className="w-full min-w-0 space-y-6 px-1">
      {/* Header: store (big, no "select store"), date under store, then links */}
      <div className="flex flex-col gap-6 border-b border-slate-200 dark:border-slate-600 pb-6">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Store</span>
            {stores.length > 1 ? (
              <select
                value={selectedStore ?? ''}
                onChange={(e) => setSelectedStore(e.target.value || null)}
                className="max-w-xs text-xl font-semibold text-slate-900 dark:text-slate-100 bg-transparent border-0 border-b-2 border-slate-200 dark:border-slate-600 rounded-none py-1 pr-8 focus:ring-0 focus:border-blue-500 cursor-pointer appearance-none bg-no-repeat bg-[length:12px] bg-[right_0_center]"
                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748b'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")` }}
              >
                {stores.map((s) => (
                  <option key={s.id} value={String(s.id)}>{s.name}</option>
                ))}
              </select>
            ) : (
              <span className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                {selectedStoreName ?? (stores[0]?.name ?? '—')}
              </span>
            )}
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mt-2">Date</label>
            <input
              type="date"
              value={selectedDate ?? ''}
              onChange={(e) => setSelectedDate(e.target.value || null)}
              className="w-full max-w-[180px] px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
            />
          </div>
          {selectedStore && selectedDate && (
            <div className="w-full sm:w-auto sm:min-w-[360px]">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">Links</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5 p-3 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50/50 dark:bg-slate-800/50">
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Cashlog</label>
                  <input type="url" placeholder="Paste URL" value={wakeupLinks.cashlog.url} onChange={(e) => setWakeupLinks('cashlog', { ...wakeupLinks.cashlog, url: e.target.value })} className="w-full px-2 py-1.5 text-sm border border-slate-200 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 placeholder-slate-400" />
                  <div className="flex items-center gap-2">
                    <input type="text" placeholder="Label" value={wakeupLinks.cashlog.label} onChange={(e) => setWakeupLinks('cashlog', { ...wakeupLinks.cashlog, label: e.target.value })} className="flex-1 min-w-0 px-2 py-1.5 text-sm border border-slate-200 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 placeholder-slate-400" />
                    {wakeupLinks.cashlog.url && <a href={wakeupLinks.cashlog.url} target="_blank" rel="noopener noreferrer" className="shrink-0 px-2 py-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline rounded-md border border-slate-200 dark:border-slate-600">{wakeupLinks.cashlog.label || 'Open'}</a>}
                  </div>
                </div>
                <div className="flex flex-col gap-1.5 p-3 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50/50 dark:bg-slate-800/50">
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Returns</label>
                  <input type="url" placeholder="Paste URL" value={wakeupLinks.returns.url} onChange={(e) => setWakeupLinks('returns', { ...wakeupLinks.returns, url: e.target.value })} className="w-full px-2 py-1.5 text-sm border border-slate-200 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 placeholder-slate-400" />
                  <div className="flex items-center gap-2">
                    <input type="text" placeholder="Label" value={wakeupLinks.returns.label} onChange={(e) => setWakeupLinks('returns', { ...wakeupLinks.returns, label: e.target.value })} className="flex-1 min-w-0 px-2 py-1.5 text-sm border border-slate-200 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 placeholder-slate-400" />
                    {wakeupLinks.returns.url && <a href={wakeupLinks.returns.url} target="_blank" rel="noopener noreferrer" className="shrink-0 px-2 py-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline rounded-md border border-slate-200 dark:border-slate-600">{wakeupLinks.returns.label || 'Open'}</a>}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {selectedStore && selectedDate && !retailData && (
        <p className="text-sm text-amber-600 dark:text-amber-400">No retail data found for this date.</p>
      )}

      {/* Two columns: KPI cards (left), How we will make goal today (right) — fluid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full min-w-0">
        <div className="lg:col-span-1 min-w-0">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Metrics & goals</h3>
          <WakeupMetricsPanel />
        </div>
        <div className="lg:col-span-2 min-w-0">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">How we will make goal today</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Current Promotion / Focuses</label>
              <textarea
                value={promotionsFocuses}
                onChange={(e) => setPromotionsFocuses(e.target.value)}
                placeholder="e.g. Super Plush robes on Last Call 40% off..."
                rows={4}
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 placeholder-slate-400 resize-y"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Product Update / Further Focus</label>
              <textarea
                value={productUpdate}
                onChange={(e) => setProductUpdate(e.target.value)}
                placeholder="e.g. Airweave rebranded as Breezeweave..."
                rows={4}
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 placeholder-slate-400 resize-y"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Staff Recognition</label>
              <textarea
                value={staffRecognition}
                onChange={(e) => setStaffRecognition(e.target.value)}
                placeholder="e.g. 20 Google reviews for Q1 goal..."
                rows={4}
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 placeholder-slate-400 resize-y"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Tasks</label>
              <textarea
                value={tasks}
                onChange={(e) => setTasks(e.target.value)}
                placeholder="Tasks for the day..."
                rows={4}
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 placeholder-slate-400 resize-y"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Zoning chart — full width, dynamic */}
      <div className="w-full min-w-0">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Employee zoning chart</h3>
        <ZoningChart />
      </div>
    </div>
  )
}
