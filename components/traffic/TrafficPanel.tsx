'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, TrendingDown, Clock, Users, Loader2 } from 'lucide-react'
import { StatCard } from '@/components/ui/StatCard'
import type { StoreConfig } from '@/lib/stores'

interface TrafficWeekly {
  id: string
  storeId: number
  weekStart: string
  sun: number | null
  mon: number | null
  tue: number | null
  wed: number | null
  thu: number | null
  fri: number | null
  sat: number | null
  total: number | null
  trendMult: string | null
  trafficCount: number | null
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const
const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const

interface TrafficPanelProps {
  store: StoreConfig
}

export function TrafficPanel({ store }: TrafficPanelProps) {
  const [weeklyData, setWeeklyData] = useState<TrafficWeekly[]>([])
  const [loading, setLoading] = useState(true)
  const [pasteText, setPasteText] = useState('')
  const [applying, setApplying] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      try {
        const res = await fetch(`/api/traffic?storeId=${store.id}`)
        if (res.ok) {
          const { weekly } = await res.json()
          setWeeklyData(weekly)
        }
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [store.id])

  const latest = weeklyData[0]
  const trendMult = latest?.trendMult ? parseFloat(latest.trendMult) : null
  const trendUp = trendMult !== null && trendMult >= 1

  // Find peak window from latest data
  function getPeakDay(): string {
    if (!latest) return '—'
    const vals = DAY_KEYS.map((k, i) => ({ day: DAYS[i], val: Number(latest[k] ?? 0) }))
    const peak = vals.reduce((a, b) => (b.val > a.val ? b : a), vals[0])
    return peak.val > 0 ? peak.day : '—'
  }

  const weekMax = latest
    ? Math.max(...DAY_KEYS.map((k) => Number(latest[k] ?? 0)))
    : 0

  async function handleApplyTrend() {
    if (!pasteText.trim()) return
    setApplying(true)

    try {
      // Parse pasted trend data (simple key: value or comma-separated)
      const lines = pasteText.trim().split('\n')
      const parsed: Record<string, number> = {}

      for (const line of lines) {
        const parts = line.split(/[\t,:]/).map((p) => p.trim())
        if (parts.length >= 2) {
          const key = parts[0].toLowerCase()
          const val = parseFloat(parts[1])
          if (!isNaN(val)) parsed[key] = val
        }
      }

      // Try to find a weekStart from paste or use current week
      const now = new Date()
      const weekStart = new Date(now)
      weekStart.setDate(now.getDate() - now.getDay())
      const weekStartStr = weekStart.toISOString().split('T')[0]

      const body = {
        storeId: store.id,
        weekStart: weekStartStr,
        sun: parsed['sun'] ?? 0,
        mon: parsed['mon'] ?? 0,
        tue: parsed['tue'] ?? 0,
        wed: parsed['wed'] ?? 0,
        thu: parsed['thu'] ?? 0,
        fri: parsed['fri'] ?? 0,
        sat: parsed['sat'] ?? 0,
        total: Object.values(parsed).reduce((a, b) => a + b, 0),
        trendMult: parsed['trend'] ? String(parsed['trend']) : undefined,
        trafficCount: parsed['count'] ? Math.round(parsed['count']) : undefined,
      }

      const res = await fetch('/api/traffic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (res.ok) {
        const fetchRes = await fetch(`/api/traffic?storeId=${store.id}`)
        if (fetchRes.ok) {
          const { weekly } = await fetchRes.json()
          setWeeklyData(weekly)
        }
        setPasteText('')
        setToast('Traffic data applied successfully.')
        setTimeout(() => setToast(null), 3000)
      }
    } finally {
      setApplying(false)
    }
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Traffic Data</h1>
        <p className="text-sm text-slate-500 mt-1">{store.name} · {store.city}</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Traffic Count"
          value={latest?.trafficCount?.toLocaleString() ?? '—'}
          accentColor={store.color}
          icon={<Users className="w-4 h-4" />}
        />
        <StatCard
          label="Trend Multiplier"
          value={trendMult !== null ? trendMult.toFixed(4) : '—'}
          accentColor={store.color}
          icon={
            trendMult !== null
              ? trendUp
                ? <TrendingUp className="w-4 h-4 text-green-600" />
                : <TrendingDown className="w-4 h-4 text-red-600" />
              : undefined
          }
          subValue={trendMult !== null ? (trendUp ? 'vs last year' : 'vs last year') : undefined}
        />
        <StatCard
          label="Peak Day"
          value={getPeakDay()}
          accentColor={store.color}
          icon={<Clock className="w-4 h-4" />}
        />
        <StatCard
          label="Weekly Total"
          value={latest?.total?.toLocaleString() ?? '—'}
          accentColor={store.color}
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Bar chart */}
        <div className="bg-white dark:bg-slate-800/50 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-600 p-5">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-4">Daily Traffic Breakdown</h2>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="h-8 bg-slate-100 dark:bg-slate-700 rounded animate-pulse" />
              ))}
            </div>
          ) : !latest ? (
            <div className="text-center py-12 text-slate-400 dark:text-slate-400 text-sm">No traffic data yet</div>
          ) : (
            <div className="space-y-2">
              {DAYS.map((day, i) => {
                const key = DAY_KEYS[i]
                const val = Number(latest[key] ?? 0)
                const pct = weekMax > 0 ? (val / weekMax) * 100 : 0
                return (
                  <div key={day} className="flex items-center gap-3">
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400 w-8">{day}</span>
                    <div className="flex-1 bg-slate-100 dark:bg-slate-700 rounded-full h-6 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500 flex items-center justify-end pr-2"
                        style={{ width: `${pct}%`, backgroundColor: store.color }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 w-16 text-right">
                      {val.toLocaleString()}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Paste zone */}
        <div className="bg-white dark:bg-slate-800/50 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-600 p-5">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-1">Paste Trend Data</h2>
          <p className="text-xs text-slate-400 dark:text-slate-400 mb-3">
            Format: <code className="bg-slate-50 dark:bg-slate-700 px-1 rounded">sun: 120</code> or tab-separated. One per line.
          </p>
          <div className="border-2 border-dashed border-blue-200 dark:border-blue-600 rounded-xl bg-blue-50/30 dark:bg-slate-800/50 p-3">
            <textarea
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder={`sun: 120\nmon: 95\ntue: 88\nwed: 102\nthu: 115\nfri: 140\nsat: 180\ntrend: 1.0832\ncount: 840`}
              className="w-full h-48 font-mono text-xs bg-transparent resize-none focus:outline-none text-slate-700 dark:text-slate-200 placeholder-slate-300 dark:placeholder-slate-500"
            />
          </div>
          <button
            onClick={handleApplyTrend}
            disabled={applying || !pasteText.trim()}
            className="mt-3 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: store.color }}
          >
            {applying && <Loader2 className="w-4 h-4 animate-spin" />}
            Apply Trend Data
          </button>
        </div>
      </div>

      {/* Historical table */}
      {weeklyData.length > 0 && (
        <div className="mt-6 bg-white dark:bg-slate-800/50 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-600 p-5">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-4">Historical Weekly Data</h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-600">
                  <th className="text-left py-2 px-3 text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-300">
                    Week
                  </th>
                  {DAYS.map((d) => (
                    <th key={d} className="text-center py-2 px-2 text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-300">
                      {d}
                    </th>
                  ))}
                  <th className="text-center py-2 px-3 text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-300">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {weeklyData.slice(0, 10).map((row) => (
                  <tr key={row.id} className="border-b border-slate-50 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/30">
                    <td className="py-2 px-3 font-medium text-slate-700 dark:text-slate-200">{row.weekStart}</td>
                    {DAY_KEYS.map((k) => (
                      <td key={k} className="py-2 px-2 text-center text-slate-600 dark:text-slate-300">
                        {Number(row[k] ?? 0).toLocaleString()}
                      </td>
                    ))}
                    <td className="py-2 px-3 text-center font-semibold" style={{ color: store.color }}>
                      {Number(row.total ?? 0).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-4 right-4 z-50 bg-green-600 text-white px-4 py-3 rounded-xl shadow-lg text-sm font-medium">
          {toast}
        </div>
      )}
    </div>
  )
}
