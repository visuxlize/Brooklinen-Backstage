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
import type { DailyOpsActuals, RecapNotes } from '@/lib/daily-ops/types'
import { CleanSelect } from './CleanSelect'

const RECAP_SECTION_LABELS: { key: keyof RecapNotes; label: string }[] = [
  { key: 'overallSales', label: 'Overall Sales' },
  { key: 'traffic', label: 'Traffic' },
  { key: 'conversion', label: 'Conversion' },
  { key: 'promotionPerformance', label: 'Promotion / Product Newness Performance' },
  { key: 'retailOpsAlerts', label: 'Retail Operations / Inventory Alerts' },
  { key: 'storeClosingNotes', label: 'Store Closing Notes' },
]

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

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
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
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copying' | 'copied' | 'error'>('idle')

  const handleSaveAsImage = async () => {
    const el = recapRef.current
    if (!el) return
    setSavingImage(true)
    try {
      const fullWidth = el.scrollWidth
      const fullHeight = el.scrollHeight
      const prevWidth = el.style.width
      const prevMinWidth = el.style.minWidth
      const prevOverflow = el.style.overflow
      const prevOverflowY = el.style.overflowY

      el.style.width = `${fullWidth}px`
      el.style.minWidth = `${fullWidth}px`
      el.style.overflow = 'visible'
      el.style.overflowY = 'visible'

      const scrollParents: { el: HTMLElement; overflow: string; overflowY: string; width: string }[] = []
      let parent = el.parentElement
      while (parent && parent !== document.body) {
        const cs = window.getComputedStyle(parent)
        if (cs.overflow === 'auto' || cs.overflow === 'scroll' || cs.overflowY === 'auto' || cs.overflowY === 'scroll') {
          scrollParents.push({
            el: parent as HTMLElement,
            overflow: parent.style.overflow,
            overflowY: parent.style.overflowY,
            width: parent.style.width,
          })
          parent.style.overflow = 'visible'
          parent.style.overflowY = 'visible'
          parent.style.width = `${fullWidth}px`
        }
        parent = parent.parentElement
      }

      el.querySelectorAll('.recap-narrative-section').forEach((section) => {
        const s = section as HTMLElement
        s.style.minHeight = 'auto'
        s.style.overflow = 'visible'
        s.querySelectorAll('textarea, p').forEach((n) => {
          (n as HTMLElement).style.overflow = 'visible'
          ;(n as HTMLElement).style.wordWrap = 'break-word'
        })
      })

      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))

      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        scrollX: -window.scrollX,
        scrollY: -window.scrollY,
        windowWidth: fullWidth,
        windowHeight: fullHeight,
        logging: false,
        imageTimeout: 0,
      } as Parameters<typeof html2canvas>[1])

      el.style.width = prevWidth
      el.style.minWidth = prevMinWidth
      el.style.overflow = prevOverflow
      el.style.overflowY = prevOverflowY
      scrollParents.forEach((sp) => {
        sp.el.style.overflow = sp.overflow
        sp.el.style.overflowY = sp.overflowY
        sp.el.style.width = sp.width
      })

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

  const buildCopyContent = () => {
    const cols = COLS.map((c) => c.label)
    const budgetRow = ['Budget Goals', ...COLS.map((c) => formatVal(c.key, budgetValues?.[c.key as keyof typeof budgetValues] ?? null))]
    const lyRow = ['LY NR', ...COLS.map((c) => (c.key === 'traffic' || c.key === 'returns' ? '--' : formatVal(c.key, lyValues?.[c.key as keyof typeof lyValues] ?? null)))]
    const actualRow = [
      'Actual Sales',
      ...COLS.map((c) => {
        const val = actualDisplay[c.key as keyof typeof actualDisplay] ?? null
        return formatVal(c.key, val)
      }),
    ]
    const pctRow = [
      '% Change (TY/Budget)',
      ...COLS.map((c) => {
        const budget = budgetValues?.[c.key as keyof typeof budgetValues] ?? null
        const actual = actualDisplay[c.key as keyof typeof actualDisplay] ?? null
        return formatPlusMinusPercent(actual, budget) ?? '--'
      }),
    ]
    const tableLines = [
      ['', ...cols].join('\t'),
      budgetRow.join('\t'),
      lyRow.join('\t'),
      actualRow.join('\t'),
      pctRow.join('\t'),
    ]
    const sectionLines: string[] = []
    RECAP_SECTION_LABELS.forEach(({ key, label }) => {
      const text = (recapNotes[key] ?? '').trim()
      if (text) {
        sectionLines.push(label)
        sectionLines.push(text)
        sectionLines.push('')
      }
    })
    const plain = [
      `${storeName}\t${formattedDate}`,
      `Weather\t${recapWeather || '—'}\tIn-Store Event\t${recapInStoreEvent || '—'}`,
      '',
      'Nightly Recap Report',
      '',
      ...tableLines,
      '',
      ...sectionLines,
    ].join('\r\n')

    const htmlTableRows = [
      `<tr><th></th>${cols.map((c) => `<th>${escapeHtml(c)}</th>`).join('')}</tr>`,
      `<tr><td>Budget Goals</td>${budgetRow.slice(1).map((c) => `<td>${escapeHtml(String(c))}</td>`).join('')}</tr>`,
      `<tr><td>LY NR</td>${lyRow.slice(1).map((c) => `<td>${escapeHtml(String(c))}</td>`).join('')}</tr>`,
      `<tr><td>Actual Sales</td>${actualRow.slice(1).map((c) => `<td>${escapeHtml(String(c))}</td>`).join('')}</tr>`,
      `<tr><td>% Change (TY/Budget)</td>${pctRow.slice(1).map((c) => `<td>${escapeHtml(String(c))}</td>`).join('')}</tr>`,
    ]
    const sectionsHtml = RECAP_SECTION_LABELS.map(({ key, label }) => {
      const text = (recapNotes[key] ?? '').trim()
      if (!text) return ''
      return `<tr><td colspan="2"><strong>${escapeHtml(label)}</strong></td></tr><tr><td colspan="2" style="padding:8px 0;white-space:pre-wrap;">${escapeHtml(text)}</td></tr>`
    }).filter(Boolean).join('')
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Nightly Recap - ${escapeHtml(storeName)} - ${escapeHtml(selectedDate)}</title></head><body style="font-family:Segoe UI,Arial,sans-serif;font-size:14px;">
<h1>${escapeHtml(storeName)} — ${escapeHtml(formattedDate)}</h1>
<p><strong>Weather:</strong> ${escapeHtml(recapWeather || '—')} &nbsp; <strong>In-Store Event:</strong> ${escapeHtml(recapInStoreEvent || '—')}</p>
<h2>Nightly Recap Report</h2>
<table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;">
${htmlTableRows.join('\n')}
</table>
${sectionsHtml ? `<h3>Notes</h3><table border="0" cellpadding="4" style="border-collapse:collapse;">${sectionsHtml}</table>` : ''}
</body></html>`
    return { plain, html }
  }

  const handleCopy = async () => {
    setCopyStatus('copying')
    try {
      const { plain, html } = buildCopyContent()
      const blobHtml = new Blob([html], { type: 'text/html' })
      const blobPlain = new Blob([plain], { type: 'text/plain' })
      await navigator.clipboard.write([
        new ClipboardItem({ 'text/html': blobHtml, 'text/plain': blobPlain }),
      ])
      setCopyStatus('copied')
      setTimeout(() => setCopyStatus('idle'), 2500)
    } catch {
      setCopyStatus('error')
      setTimeout(() => setCopyStatus('idle'), 2500)
    }
  }

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={handleCopy}
          disabled={copyStatus === 'copying'}
          className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 rounded-lg disabled:opacity-50 transition-colors"
        >
          {copyStatus === 'copied' ? 'Copied!' : copyStatus === 'error' ? 'Copy failed' : copyStatus === 'copying' ? 'Copying…' : 'Copy (paste into Excel/Word)'}
        </button>
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
