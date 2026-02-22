'use client'

import { useRef, useState } from 'react'
import html2canvas from 'html2canvas'
import { useDailyOps } from '@/lib/daily-ops/DailyOpsContext'
import {
  formatCurrency,
  formatPercent,
  formatUpt,
  formatPlusMinusPercent,
  getPlusMinusColor,
} from '@/lib/daily-ops/formatters'
import { STORE_CONFIG } from '@/lib/stores'

const WEATHER_OPTIONS = [
  { value: '', label: '— Select —', bg: 'bg-slate-50 dark:bg-slate-800' },
  { value: 'Sunny', label: 'Sunny', bg: 'bg-amber-50 dark:bg-amber-900/20' },
  { value: 'Overcast/Cloudy', label: 'Overcast/Cloudy', bg: 'bg-slate-100 dark:bg-slate-700/50' },
  { value: 'Light/Partial Rain', label: 'Light/Partial Rain', bg: 'bg-sky-50 dark:bg-sky-900/20' },
  { value: 'Heavy Rain', label: 'Heavy Rain', bg: 'bg-blue-100 dark:bg-blue-900/30' },
  { value: 'Excessive Heat', label: 'Excessive Heat', bg: 'bg-orange-100 dark:bg-orange-900/30' },
  { value: 'Light Snow / Freezing Rain', label: 'Light Snow / Freezing Rain', bg: 'bg-cyan-50 dark:bg-cyan-900/20' },
  { value: 'Heavy Snow / Freezing Rain', label: 'Heavy Snow / Freezing Rain', bg: 'bg-indigo-100 dark:bg-indigo-900/30' },
  { value: 'Excessively Cold', label: 'Excessively Cold', bg: 'bg-violet-50 dark:bg-violet-900/20' },
] as const

const IN_STORE_EVENT_OPTIONS = [
  { value: '', label: '— Select —' },
  { value: 'No', label: 'No' },
  { value: 'Yes', label: 'Yes' },
]

type ActualKey = 'netRevenue' | 'orders' | 'upt' | 'traffic' | 'returns' | 'aov' | 'cvr'

const COLS: { key: ActualKey; label: string }[] = [
  { key: 'netRevenue', label: 'Net Rev' },
  { key: 'orders', label: 'Orders' },
  { key: 'upt', label: 'UPT' },
  { key: 'aov', label: 'AOV' }, // computed
  { key: 'traffic', label: 'Traffic' },
  { key: 'cvr', label: 'CVR' }, // computed
  { key: 'returns', label: 'Returns' },
]

/** Budget/LY from retailData; Actual from context. AOV = netRevenue/orders, CVR = orders/traffic. % = (actual/budget*100)-100. */
export function NightlyRecapPanel() {
  const {
    selectedStore,
    selectedDate,
    retailData,
    actuals,
    setActual,
    recapWeather,
    setRecapWeather,
    recapInStoreEvent,
    setRecapInStoreEvent,
    recapNotes,
    setRecapNote,
  } = useDailyOps()

  const budgetValues = retailData
    ? {
        netRevenue: retailData.netRevBudget,
        orders: retailData.ordersBudget,
        upt: retailData.uptBudget,
        aov: retailData.aovBudget,
        traffic: retailData.trafficBudget,
        cvr: retailData.cvrBudget,
        returns: null as number | null,
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
        returns: null as number | null,
      }
    : null

  const computedAov =
    actuals.netRevenue != null && actuals.orders != null && actuals.orders !== 0
      ? actuals.netRevenue / actuals.orders
      : null
  const computedCvr =
    actuals.orders != null && actuals.traffic != null && actuals.traffic !== 0
      ? actuals.orders / actuals.traffic
      : null

  const actualDisplay = {
    netRevenue: actuals.netRevenue,
    orders: actuals.orders,
    upt: actuals.upt,
    aov: computedAov,
    traffic: actuals.traffic,
    cvr: computedCvr,
    returns: actuals.returns,
  }

  const formatVal = (key: string, v: number | null) => {
    if (v == null) return '--'
    if (key === 'netRevenue' || key === 'aov' || key === 'returns') return formatCurrency(v)
    if (key === 'orders' || key === 'traffic') return String(Math.round(v))
    if (key === 'upt') return formatUpt(v)
    if (key === 'cvr') return formatPercent(v)
    return '--'
  }

  if (!selectedStore || !selectedDate) {
    return (
      <div className="text-sm text-slate-500 dark:text-slate-400">
        Select store and date in Morning Wakeup to see Nightly Recap.
      </div>
    )
  }

  const storeName = STORE_CONFIG.find((s) => String(s.id) === selectedStore)?.name ?? selectedStore
  const weatherBg = WEATHER_OPTIONS.find((o) => o.value === recapWeather)?.bg ?? 'bg-slate-50 dark:bg-slate-800'
  const recapRef = useRef<HTMLDivElement>(null)
  const [savingImage, setSavingImage] = useState(false)

  const handleSaveAsImage = async () => {
    const el = recapRef.current
    if (!el) return
    setSavingImage(true)
    const savedStyles: { el: HTMLElement; minWidth: string }[] = []
    const textareaHeights: { el: HTMLTextAreaElement; height: string }[] = []
    try {
      // Temporarily expand container to full content width so table/inputs don't clip
      savedStyles.push({ el, minWidth: el.style.minWidth })
      el.style.minWidth = `${el.scrollWidth}px`
      // Expand all textareas to full content height so no vertical clipping
      const textareas = el.querySelectorAll('textarea')
      textareas.forEach((ta) => {
        textareaHeights.push({ el: ta, height: ta.style.height })
        ta.style.overflow = 'hidden'
        ta.style.height = '0'
        ta.style.height = `${Math.max(ta.scrollHeight, 60)}px`
      })
      // Let layout settle
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
      const w = el.scrollWidth
      const h = el.scrollHeight
      const canvas = await html2canvas(el, {
        useCORS: true,
        scale: 2,
        width: w,
        height: h,
        scrollX: 0,
        scrollY: 0,
        backgroundColor: '#ffffff',
        logging: false,
      } as Parameters<typeof html2canvas>[1])
      const dataUrl = canvas.toDataURL('image/png')
      const link = document.createElement('a')
      link.download = `nightly-recap-${selectedStore}-${selectedDate}.png`
      link.href = dataUrl
      link.click()
    } finally {
      savedStyles.forEach(({ el: e, minWidth }) => { e.style.minWidth = minWidth })
      textareaHeights.forEach(({ el: ta, height }) => { ta.style.height = height; ta.style.overflow = '' })
      setSavingImage(false)
    }
  }

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSaveAsImage}
          disabled={savingImage}
          className="px-4 py-2 text-sm font-medium text-white bg-slate-700 hover:bg-slate-600 dark:bg-slate-600 dark:hover:bg-slate-500 rounded-lg disabled:opacity-50 transition-colors"
        >
          {savingImage ? 'Saving…' : 'Save as image (for email)'}
        </button>
      </div>
      <div ref={recapRef} className="space-y-6 overflow-x-auto bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-600">
      <div className="flex flex-col gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1">Store</p>
          <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">{storeName}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1">Date</p>
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{selectedDate}</p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Weather</label>
            <select
              value={recapWeather}
              onChange={(e) => setRecapWeather(e.target.value)}
              className={`px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg min-w-[180px] ${weatherBg} text-slate-900 dark:text-slate-100`}
            >
              {WEATHER_OPTIONS.map((o) => (
                <option key={o.value || 'blank'} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">In-Store Event</label>
            <select
              value={recapInStoreEvent}
              onChange={(e) => setRecapInStoreEvent(e.target.value)}
              className="px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 min-w-[120px]"
            >
              {IN_STORE_EVENT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-slate-200 dark:border-slate-600">
            <th className="text-left py-2 pr-4 text-slate-500 dark:text-slate-400 font-medium min-w-[8rem]"></th>
            {COLS.map((c) => (
              <th key={c.key} className="text-center py-2 px-2 text-slate-600 dark:text-slate-300 font-medium">
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-slate-100 dark:border-slate-700 bg-amber-50/50 dark:bg-amber-900/10">
            <td className="py-2 pr-4 font-medium text-slate-600 dark:text-slate-300">Budget Goals</td>
            {COLS.map((c) => {
              const val = budgetValues?.[c.key as keyof typeof budgetValues] ?? null
              return (
                <td key={c.key} className="text-center py-1 px-2 text-slate-700 dark:text-slate-200">
                  {formatVal(c.key, val)}
                </td>
              )
            })}
          </tr>
          <tr className="border-b border-slate-100 dark:border-slate-700">
            <td className="py-2 pr-4 font-medium text-slate-600 dark:text-slate-300">LY NR</td>
            {COLS.map((c) => {
              const val = lyValues?.[c.key as keyof typeof lyValues] ?? null
              return (
                <td key={c.key} className="text-center py-1 px-2 text-slate-600 dark:text-slate-400">
                  {c.key === 'traffic' || c.key === 'returns' ? '--' : formatVal(c.key, val)}
                </td>
              )
            })}
          </tr>
          <tr className="border-b border-slate-200 dark:border-slate-600">
            <td className="py-2 pr-4 font-medium text-slate-600 dark:text-slate-300">Actual Sales</td>
            {COLS.map((c) => {
              const isComputed = c.key === 'aov' || c.key === 'cvr'
              const val = actualDisplay[c.key as keyof typeof actualDisplay] ?? null
              return (
                <td key={c.key} className="text-center py-1 px-2">
                  {isComputed ? (
                    <span className="text-slate-700 dark:text-slate-200">{formatVal(c.key, val)}</span>
                  ) : (
                    c.key === 'returns' ? (
                      <div className="flex items-center justify-center gap-0.5">
                        <span className="text-slate-500 dark:text-slate-400 text-sm">$</span>
                        <input
                          type="number"
                          step={1}
                          min={0}
                          placeholder="0"
                          value={actuals.returns ?? ''}
                          onChange={(e) => {
                            const raw = e.target.value
                            if (raw === '') {
                              setActual('returns', null)
                              return
                            }
                            const n = Number(raw)
                            if (!Number.isNaN(n)) setActual('returns', n)
                          }}
                          className="w-full min-w-[4rem] max-w-[100px] px-2 py-1 text-center text-sm border border-slate-200 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                        />
                      </div>
                    ) : (
                      <input
                        type="number"
                        step={c.key === 'upt' ? 0.1 : 1}
                        placeholder="—"
                        value={(c.key !== 'aov' && c.key !== 'cvr' ? actuals[c.key] : undefined) ?? ''}
                        onChange={(e) => {
                          const raw = e.target.value
                          if (raw === '') {
                            if (c.key !== 'aov' && c.key !== 'cvr') setActual(c.key, null)
                            return
                          }
                          const n = Number(raw)
                          if (!Number.isNaN(n) && c.key !== 'aov' && c.key !== 'cvr') setActual(c.key, n)
                        }}
                        className="w-full min-w-[3rem] max-w-[120px] mx-auto px-2 py-1 text-center text-sm border border-slate-200 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                      />
                    )
                  )}
                </td>
              )
            })}
          </tr>
          <tr>
            <td className="py-2 pr-4 font-medium text-slate-600 dark:text-slate-300">% Change (TY/Budget)</td>
            {COLS.map((c) => {
              const budget = budgetValues?.[c.key as keyof typeof budgetValues] ?? null
              const actual = actualDisplay[c.key as keyof typeof actualDisplay] ?? null
              const pct = formatPlusMinusPercent(actual, budget)
              return (
                <td key={c.key} className={`text-center py-1 px-2 tabular-nums ${getPlusMinusColor(pct)}`}>
                  {pct ?? '--'}
                </td>
              )
            })}
          </tr>
        </tbody>
      </table>

      <p className="text-xs text-slate-500 dark:text-slate-400">
        What helped/prevented you from achieving your sales plan? What actions did your team take to drive the business? Any noteworthy product performance callouts? Any in-store events or activations?
      </p>

      <div className="space-y-4">
        <section>
          <h4 className="text-sm font-semibold bg-slate-700 dark:bg-slate-600 text-white px-3 py-2 rounded-t">
            Overall Sales
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 px-1 py-1">
            What impacted total performance for the day? How did SLEEP behavior impact results?
          </p>
          <textarea
            value={recapNotes.overallSales}
            onChange={(e) => setRecapNote('overallSales', e.target.value)}
            placeholder="e.g. Slow day due to internet outages..."
            rows={4}
            className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-b-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 placeholder-slate-400 resize-y"
          />
        </section>
        <section>
          <h4 className="text-sm font-semibold bg-slate-700 dark:bg-slate-600 text-white px-3 py-2 rounded-t">
            Traffic
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 px-1 py-1">
            Were there any notable observations on traffic?
          </p>
          <textarea
            value={recapNotes.traffic}
            onChange={(e) => setRecapNote('traffic', e.target.value)}
            placeholder="e.g. Traffic mainly for TOs and walk-ins..."
            rows={3}
            className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-b-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 placeholder-slate-400 resize-y"
          />
        </section>
        <section>
          <h4 className="text-sm font-semibold bg-slate-700 dark:bg-slate-600 text-white px-3 py-2 rounded-t">
            Conversion
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 px-1 py-1">
            What insights/observations did you notice from customers purchasing or not purchasing today?
          </p>
          <textarea
            value={recapNotes.conversion}
            onChange={(e) => setRecapNote('conversion', e.target.value)}
            placeholder="..."
            rows={3}
            className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-b-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 placeholder-slate-400 resize-y"
          />
        </section>
        <section>
          <h4 className="text-sm font-semibold bg-slate-700 dark:bg-slate-600 text-white px-3 py-2 rounded-t">
            Promotion / Product Newness Performance
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 px-1 py-1">
            How did the current promotion or new product (within last 30 days) impact results?
          </p>
          <textarea
            value={recapNotes.promotionPerformance}
            onChange={(e) => setRecapNote('promotionPerformance', e.target.value)}
            placeholder="..."
            rows={3}
            className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-b-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 placeholder-slate-400 resize-y"
          />
        </section>
        <section>
          <h4 className="text-sm font-semibold bg-slate-700 dark:bg-slate-600 text-white px-3 py-2 rounded-t">
            Retail Operations / Inventory Alerts
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 px-1 py-1">
            Are there any critical or urgent Operations or Inventory issues to flag to HQ?
          </p>
          <textarea
            value={recapNotes.retailOpsAlerts}
            onChange={(e) => setRecapNote('retailOpsAlerts', e.target.value)}
            placeholder="..."
            rows={3}
            className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-b-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 placeholder-slate-400 resize-y"
          />
        </section>
        <section>
          <h4 className="text-sm font-semibold bg-slate-700 dark:bg-slate-600 text-white px-3 py-2 rounded-t">
            Store Closing Notes
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 px-1 py-1">
            Are there any updates / actions for tomorrow? (Not used for communicating to HQ)
          </p>
          <textarea
            value={recapNotes.storeClosingNotes}
            onChange={(e) => setRecapNote('storeClosingNotes', e.target.value)}
            placeholder="..."
            rows={3}
            className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-b-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 placeholder-slate-400 resize-y"
          />
        </section>
      </div>
      </div>
    </div>
  )
}
