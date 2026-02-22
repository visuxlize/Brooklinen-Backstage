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
import type { DailyOpsActuals } from '@/lib/daily-ops/types'
import { CleanSelect } from './CleanSelect'

const WEATHER_OPTIONS = [
  { value: '', label: '— Select —' },
  { value: 'Sunny', label: 'Sunny' },
  { value: 'Overcast/Cloudy', label: 'Overcast/Cloudy' },
  { value: 'Light/Partial Rain', label: 'Light/Partial Rain' },
  { value: 'Heavy Rain', label: 'Heavy Rain' },
  { value: 'Excessive Heat', label: 'Excessive Heat' },
  { value: 'Light Snow / Freezing Rain', label: 'Light Snow / Freezing Rain' },
  { value: 'Heavy Snow / Freezing Rain', label: 'Heavy Snow / Freezing Rain' },
  { value: 'Excessively Cold', label: 'Excessively Cold' },
]

const IN_STORE_OPTIONS = [
  { value: '', label: '— Select —' },
  { value: 'No', label: 'No' },
  { value: 'Yes', label: 'Yes' },
]

function formatRecapDate(dateStr: string): string {
  if (!dateStr || dateStr.length < 10) return dateStr
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

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
  const formattedDate = formatRecapDate(selectedDate)
  const recapRef = useRef<HTMLDivElement>(null)
  const [savingImage, setSavingImage] = useState(false)

  const handleSaveAsImage = async () => {
    const el = recapRef.current
    if (!el) return
    setSavingImage(true)
    try {
      const clone = el.cloneNode(true) as HTMLElement
      clone.style.cssText = `
        position: fixed;
        top: -9999px;
        left: 0;
        width: ${el.offsetWidth}px;
        background: #ffffff;
        overflow: visible;
      `
      document.body.appendChild(clone)

      clone.querySelectorAll('.clean-select-trigger').forEach((btn) => {
        const span = document.createElement('span')
        span.textContent = (btn.textContent ?? '').replace(/[\u2039\u203A▼▲⌄]/g, '').trim()
        span.style.cssText = `
          font-size: 0.95rem;
          font-weight: 500;
          color: #1a2332;
          font-family: inherit;
        `
        btn.parentNode?.replaceChild(span, btn)
      })

      clone.querySelectorAll('.actual-sales-row input').forEach((inp) => {
        const input = inp as HTMLInputElement
        const rawVal = input.value
        const parent = input.parentNode as HTMLElement
        const isCurrency = parent?.querySelector('.input-prefix')
        const displayText = rawVal ? (isCurrency ? `$${rawVal}` : rawVal) : '—'
        const span = document.createElement('span')
        span.textContent = displayText
        span.style.cssText = `
          font-size: inherit;
          color: ${rawVal ? '#1a2332' : '#c5cdd8'};
          font-weight: 400;
          font-family: inherit;
        `
        if (parent && (parent.classList.contains('flex') || parent.querySelector('.input-prefix'))) {
          parent.textContent = ''
          parent.appendChild(span)
        } else {
          input.parentNode?.replaceChild(span, input)
        }
      })

      clone.querySelectorAll('.recap-narrative-section').forEach((section) => {
        const ta = section.querySelector('textarea')
        if (!ta) return
        if (!(ta as HTMLTextAreaElement).value.trim()) {
          ;(section as HTMLElement).style.display = 'none'
          return
        }
        const div = document.createElement('div')
        div.textContent = (ta as HTMLTextAreaElement).value
        div.style.cssText = `
          white-space: pre-wrap;
          word-wrap: break-word;
          font-size: 0.95rem;
          line-height: 1.7;
          color: #1a2332;
          padding: 12px 0 12px 14px;
          border-left: 3px solid #2563eb;
          font-family: inherit;
        `
        ta.parentNode?.replaceChild(div, ta)
      })

      await new Promise((r) => setTimeout(r, 120))

      const canvas = await html2canvas(clone, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        scrollX: 0,
        scrollY: 0,
        windowWidth: clone.offsetWidth,
        windowHeight: clone.scrollHeight,
        logging: false,
      } as Parameters<typeof html2canvas>[1])

      document.body.removeChild(clone)

      const safeName = storeName.toLowerCase().replace(/\s+/g, '-')
      const safeDate = selectedDate.replace(/\s+/g, '-').toLowerCase()
      const link = document.createElement('a')
      link.download = `nightly-recap-${safeName}-${safeDate}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    } finally {
      setSavingImage(false)
    }
  }

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
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
      <div ref={recapRef} className="space-y-6 overflow-x-auto overflow-y-visible bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-600">
      {/* Header — 3-column layout */}
      <div
        className="flex flex-col sm:flex-row items-start justify-between gap-6 border-b border-[#f0f1f3]"
        style={{ padding: '28px 36px 24px' }}
      >
        <div className="flex flex-col gap-1 flex-1">
          <span className="text-[0.68rem] font-bold tracking-[0.1em] text-[#8a94a6] uppercase">Store</span>
          <h1 className="text-[1.85rem] font-bold text-[#1a2332] leading-tight m-0" style={{ lineHeight: 1.15 }}>{storeName}</h1>
          <p className="text-base text-[#4b5563] font-normal mt-1 mb-0">{formattedDate}</p>
        </div>
        <div className="flex flex-col items-center justify-center flex-1 text-center py-1.5">
          <h2 className="text-[1.35rem] font-bold text-[#1a2332] m-0 leading-tight tracking-tight">Nightly Recap</h2>
          <p className="text-[1.35rem] font-bold text-[#1a2332] m-0 leading-tight tracking-tight">Report</p>
        </div>
        <div className="flex flex-col items-end gap-4 flex-1">
          <div className="flex flex-col items-end gap-0.5">
            <span className="text-[0.68rem] font-bold tracking-[0.08em] text-[#8a94a6] uppercase">☁ Weather</span>
            <CleanSelect
              value={recapWeather}
              onChange={setRecapWeather}
              options={WEATHER_OPTIONS}
              placeholder="— Select —"
              alignRight
            />
          </div>
          <div className="flex flex-col items-end gap-0.5">
            <span className="text-[0.68rem] font-bold tracking-[0.08em] text-[#8a94a6] uppercase">In-Store Event</span>
            <CleanSelect
              value={recapInStoreEvent}
              onChange={setRecapInStoreEvent}
              options={IN_STORE_OPTIONS}
              placeholder="— Select —"
              alignRight
            />
          </div>
        </div>
      </div>

      <div className="px-6 pt-4 pb-6">
      <table className="metrics-table w-full border-collapse text-sm">
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
          <tr className="actual-sales-row border-b border-slate-200 dark:border-slate-600">
            <td className="py-2 pr-4 font-medium text-slate-600 dark:text-slate-300">Actual Sales</td>
            {COLS.map((c) => {
              const isComputed = c.key === 'aov' || c.key === 'cvr'
              const isCurrency = c.key === 'netRevenue' || c.key === 'returns'
              const val = actualDisplay[c.key as keyof typeof actualDisplay] ?? null
              const currencyVal = c.key === 'netRevenue' ? actuals.netRevenue : actuals.returns
              const hasCurrencyValue = currencyVal != null
              return (
                <td key={c.key} className="text-center py-1 px-2">
                  {isComputed ? (
                    <span className="text-slate-700 dark:text-slate-200">{formatVal(c.key, val)}</span>
                  ) : isCurrency ? (
                    <div className="flex items-center justify-center gap-0.5">
                      <span className={`input-prefix shrink-0 text-sm transition-colors ${hasCurrencyValue ? 'text-[#1a2332]' : 'text-[#9ca3af]'}`}>$</span>
                      <input
                        type="number"
                        step={1}
                        min={0}
                        placeholder={c.key === 'returns' ? '0' : '—'}
                        value={(c.key === 'netRevenue' ? actuals.netRevenue : actuals.returns) ?? ''}
                        onChange={(e) => {
                          const raw = e.target.value
                          if (raw === '') {
                            setActual(c.key as 'netRevenue' | 'returns', null)
                            return
                          }
                          const n = Number(raw)
                          if (!Number.isNaN(n)) setActual(c.key as 'netRevenue' | 'returns', n)
                        }}
                        className="actual-sales-input w-full min-w-[4rem] max-w-[100px] bg-transparent border-0 border-b-[1.5px] border-transparent rounded-none outline-none shadow-none py-1 px-0.5 text-center text-inherit text-[#1a2332] font-normal transition-[border-color] hover:border-[#d1d5db] focus:border-[#2563eb] focus:bg-transparent focus:outline-none focus:shadow-none appearance-none"
                      />
                    </div>
                  ) : (
                    <input
                      type="number"
                      step={c.key === 'upt' ? 0.1 : 1}
                      placeholder="—"
                      value={(c.key !== 'aov' && c.key !== 'cvr' ? actuals[c.key as keyof typeof actuals] : undefined) ?? ''}
                      onChange={(e) => {
                        const raw = e.target.value
                        if (raw === '') {
                          if (c.key !== 'aov' && c.key !== 'cvr') setActual(c.key as keyof DailyOpsActuals, null)
                          return
                        }
                        const n = Number(raw)
                        if (!Number.isNaN(n) && c.key !== 'aov' && c.key !== 'cvr') setActual(c.key as keyof DailyOpsActuals, n)
                      }}
                      className="actual-sales-input w-full min-w-[3rem] max-w-[120px] mx-auto bg-transparent border-0 border-b-[1.5px] border-transparent rounded-none outline-none shadow-none py-1 px-0.5 text-center text-inherit text-[#1a2332] font-normal transition-[border-color] hover:border-[#d1d5db] focus:border-[#2563eb] focus:bg-transparent focus:outline-none focus:shadow-none appearance-none"
                    />
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
        <section className="recap-narrative-section">
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
            className="recap-narrative-textarea w-full bg-transparent border-0 border-l-[3px] border-transparent rounded-none outline-none resize-y min-h-[88px] py-3 pl-3.5 pr-0 text-[0.95rem] leading-[1.7] text-[#1a2332] box-border transition-[border-color] hover:border-l-[#e2e5ea] focus:border-l-[#2563eb] placeholder:text-[#b8bfca] placeholder:italic placeholder:font-light"
          />
        </section>
        <section className="recap-narrative-section">
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
            className="recap-narrative-textarea w-full bg-transparent border-0 border-l-[3px] border-transparent rounded-none outline-none resize-y min-h-[88px] py-3 pl-3.5 pr-0 text-[0.95rem] leading-[1.7] text-[#1a2332] box-border transition-[border-color] hover:border-l-[#e2e5ea] focus:border-l-[#2563eb] placeholder:text-[#b8bfca] placeholder:italic placeholder:font-light"
          />
        </section>
        <section className="recap-narrative-section">
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
            className="recap-narrative-textarea w-full bg-transparent border-0 border-l-[3px] border-transparent rounded-none outline-none resize-y min-h-[88px] py-3 pl-3.5 pr-0 text-[0.95rem] leading-[1.7] text-[#1a2332] box-border transition-[border-color] hover:border-l-[#e2e5ea] focus:border-l-[#2563eb] placeholder:text-[#b8bfca] placeholder:italic placeholder:font-light"
          />
        </section>
        <section className="recap-narrative-section">
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
            className="recap-narrative-textarea w-full bg-transparent border-0 border-l-[3px] border-transparent rounded-none outline-none resize-y min-h-[88px] py-3 pl-3.5 pr-0 text-[0.95rem] leading-[1.7] text-[#1a2332] box-border transition-[border-color] hover:border-l-[#e2e5ea] focus:border-l-[#2563eb] placeholder:text-[#b8bfca] placeholder:italic placeholder:font-light"
          />
        </section>
        <section className="recap-narrative-section">
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
            className="recap-narrative-textarea w-full bg-transparent border-0 border-l-[3px] border-transparent rounded-none outline-none resize-y min-h-[88px] py-3 pl-3.5 pr-0 text-[0.95rem] leading-[1.7] text-[#1a2332] box-border transition-[border-color] hover:border-l-[#e2e5ea] focus:border-l-[#2563eb] placeholder:text-[#b8bfca] placeholder:italic placeholder:font-light"
          />
        </section>
        <section className="recap-narrative-section">
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
            className="recap-narrative-textarea w-full bg-transparent border-0 border-l-[3px] border-transparent rounded-none outline-none resize-y min-h-[88px] py-3 pl-3.5 pr-0 text-[0.95rem] leading-[1.7] text-[#1a2332] box-border transition-[border-color] hover:border-l-[#e2e5ea] focus:border-l-[#2563eb] placeholder:text-[#b8bfca] placeholder:italic placeholder:font-light"
          />
        </section>
      </div>
      </div>
      </div>
    </div>
  )
}
