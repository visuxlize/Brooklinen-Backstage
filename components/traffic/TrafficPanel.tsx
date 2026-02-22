'use client'

import { useState, useEffect, useRef } from 'react'
import { TrendingUp, TrendingDown, Clock, Users, Loader2, FileSpreadsheet } from 'lucide-react'
import { StatCard } from '@/components/ui/StatCard'
import type { StoreConfig } from '@/lib/stores'
import { findClosestLYWeek } from '@/lib/scheduleHours'

const DAY_HEADERS_LOWER = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']

function normalizeHeader(cell: unknown): string {
  if (cell == null) return ''
  const s = String(cell).trim().toLowerCase().replace(/\s+/g, '')
  return s
}

/** Map header to day index 0..6 (Sun=0). */
function headerToDayIndex(h: string): number {
  const three = h.slice(0, 3)
  const idx = DAY_HEADERS_LOWER.findIndex((d) => d.startsWith(three) || three.startsWith(d))
  return idx >= 0 ? idx : -1
}

type ExtractedWeek = {
  sun: number; mon: number; tue: number; wed: number; thu: number; fri: number; sat: number
  total?: number; trendMult?: string; trafficCount?: number; weekStart?: string
}

/** Extract week rows from one sheet (header row = first row, columns sun..sat required). */
function extractWeeksFromSheet(sheet: Record<string, unknown>): ExtractedWeek[] {
  const range = (sheet as { ['!ref']?: string })['!ref']
  if (!range) return []
  const decoded = decodeRange(range)
  if (!decoded) return []
  const { s, e } = decoded
  const headerRow: string[] = []
  for (let c = s.c; c <= e.c; c++) {
    const key = encodeCell(s.r, c)
    const val = (sheet[key] as { v?: unknown })?.v
    headerRow.push(normalizeHeader(val))
  }
  const dayCols: (number | undefined)[] = [undefined, undefined, undefined, undefined, undefined, undefined, undefined]
  let totalCol: number | null = null
  let trendCol: number | null = null
  let countCol: number | null = null
  let weekStartCol: number | null = null
  for (let c = 0; c < headerRow.length; c++) {
    const h = headerRow[c]
    const dayIdx = DAY_HEADERS_LOWER.indexOf(h) >= 0 ? DAY_HEADERS_LOWER.indexOf(h) : headerToDayIndex(h)
    if (dayIdx >= 0) dayCols[dayIdx] = c
    if (/total|sum/i.test(h)) totalCol = c
    if (/trend|mult/i.test(h)) trendCol = c
    if (/count|traffic/i.test(h)) countCol = c
    if (/week|date|start/i.test(h)) weekStartCol = c
  }
  const hasAllDays = dayCols.every((c) => c != null)
  if (!hasAllDays) return []
  const rows: ExtractedWeek[] = []
  for (let r = s.r + 1; r <= e.r; r++) {
    const sun = num(sheet, r, dayCols[0]!)
    const mon = num(sheet, r, dayCols[1]!)
    const tue = num(sheet, r, dayCols[2]!)
    const wed = num(sheet, r, dayCols[3]!)
    const thu = num(sheet, r, dayCols[4]!)
    const fri = num(sheet, r, dayCols[5]!)
    const sat = num(sheet, r, dayCols[6]!)
    if ([sun, mon, tue, wed, thu, fri, sat].every((n) => n >= 0)) {
      const total = totalCol != null ? num(sheet, r, totalCol) : sun + mon + tue + wed + thu + fri + sat
      const trendVal = trendCol != null ? (sheet[encodeCell(r, trendCol)] as { v?: unknown })?.v : undefined
      const countVal = countCol != null ? num(sheet, r, countCol) : undefined
      let weekStart: string | undefined
      if (weekStartCol != null) {
        const cell = sheet[encodeCell(r, weekStartCol)] as { v?: unknown; w?: string }
        const raw = cell?.v ?? cell?.w
        if (raw != null) {
          const d = typeof raw === 'number' ? excelDateToISO(raw) : parseDateString(String(raw))
          if (d) weekStart = getWeekStartSunday(d)
        }
      }
      rows.push({
        sun, mon, tue, wed, thu, fri, sat,
        total: total > 0 ? total : undefined,
        trendMult: trendVal != null ? String(trendVal) : undefined,
        trafficCount: countVal != null && countVal >= 0 ? Math.round(countVal) : undefined,
        weekStart,
      })
    }
  }
  return rows
}

function num(sheet: Record<string, unknown>, row: number, col: number): number {
  const v = (sheet[encodeCell(row, col)] as { v?: unknown })?.v
  if (v == null) return -1
  const n = Number(v)
  return Number.isNaN(n) ? -1 : n
}

function encodeCell(r: number, c: number): string {
  let col = ''
  for (let x = c; x >= 0; x = Math.floor(x / 26) - 1) col = String.fromCharCode((x % 26) + 65) + col
  return col + (r + 1)
}

function decodeRange(ref: string): { s: { r: number; c: number }; e: { r: number; c: number } } | null {
  const m = ref.match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/i)
  if (!m) return null
  const col = (s: string) => s.split('').reduce((acc, ch) => acc * 26 + (ch.toUpperCase().charCodeAt(0) - 64), 0) - 1
  return { s: { r: parseInt(m[2], 10) - 1, c: col(m[1]) }, e: { r: parseInt(m[4], 10) - 1, c: col(m[3]) } }
}

function excelDateToISO(n: number): string | null {
  try {
    const d = new Date((n - 25569) * 86400 * 1000)
    return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10)
  } catch {
    return null
  }
}

function parseDateString(s: string): string | null {
  const d = new Date(s.trim())
  return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10)
}

function getWeekStartSunday(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  const day = d.getDay()
  d.setDate(d.getDate() - day)
  return d.toISOString().slice(0, 10)
}

/** Excel serial date to YYYY-MM-DD (Sunday = week start). */
function excelSerialToWeekStart(serial: number): string | null {
  try {
    const d = new Date((serial - 25569) * 86400 * 1000)
    if (isNaN(d.getTime())) return null
    const day = d.getDay()
    d.setDate(d.getDate() - day)
    return d.toISOString().slice(0, 10)
  } catch {
    return null
  }
}

/** Match current store to Excel store name (e.g. "101 Williamsburg" -> store id 101 / name "Williamsburg"). */
function storeMatchesExcelName(store: StoreConfig, excelStoreName: string): boolean {
  const s = String(excelStoreName ?? '').trim()
  if (!s) return false
  if (s.includes(store.name)) return true
  const withoutNumber = s.replace(/^\d+\s*/, '').trim()
  if (withoutNumber.toLowerCase() === store.name.toLowerCase()) return true
  if (String(store.id) === s.slice(0, String(store.id).length) && s.includes(store.name)) return true
  return false
}

/**
 * Parse "Retail Traffic Data Pulls_WB.xlsx" format:
 * - "Last 5 Weeks Traffic Trends": Store Name, Traffic Count, Recent Trend Multiplier (row per store).
 * - "Historical Week Data - Last Com": Store, Start of Week (Excel serial), Hour..., Sun–Sat (cols 4–10). Aggregate by week.
 */
function parseRetailTrafficWorkbook(
  wb: { SheetNames: string[]; Sheets: Record<string, unknown> },
  store: StoreConfig,
  XLSX: { utils: { sheet_to_json: (sheet: unknown, opts: { header: number; defval: string }) => (string | number)[][] } }
): { weeks: ExtractedWeek[]; trendCount?: number; trendMult?: number } {
  const result: { weeks: ExtractedWeek[]; trendCount?: number; trendMult?: number } = { weeks: [] }

  const trendSheetName = wb.SheetNames.find((n) => /last\s*5\s*weeks\s*traffic\s*trends/i.test(n))
  const histSheetName = wb.SheetNames.find((n) => /historical\s*week\s*data/i.test(n))

  if (trendSheetName) {
    const sheet = wb.Sheets[trendSheetName]
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as (string | number)[][]
    for (let i = 2; i < rows.length; i++) {
      const row = rows[i] ?? []
      const excelStore = row[0] != null ? String(row[0]).trim() : ''
      if (!storeMatchesExcelName(store, excelStore)) continue
      const trafficCount = row[1] != null && row[1] !== '' ? Math.round(Number(row[1])) : undefined
      const trendMult = row[2] != null && row[2] !== '' ? Number(row[2]) : undefined
      if (trafficCount != null && !Number.isNaN(trafficCount)) result.trendCount = trafficCount
      if (trendMult != null && !Number.isNaN(trendMult)) result.trendMult = trendMult
      break
    }
  }

  if (histSheetName) {
    const sheet = wb.Sheets[histSheetName]
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as (string | number)[][]
    const byWeek = new Map<number, number[]>()
    for (let i = 2; i < rows.length; i++) {
      const row = rows[i] ?? []
      const excelStore = row[0] != null ? String(row[0]).trim() : ''
      if (!storeMatchesExcelName(store, excelStore)) continue
      const weekSerial = row[1] != null ? Number(row[1]) : NaN
      if (Number.isNaN(weekSerial)) continue
      const sun = Math.round(Number(row[4] ?? 0) || 0)
      const mon = Math.round(Number(row[5] ?? 0) || 0)
      const tue = Math.round(Number(row[6] ?? 0) || 0)
      const wed = Math.round(Number(row[7] ?? 0) || 0)
      const thu = Math.round(Number(row[8] ?? 0) || 0)
      const fri = Math.round(Number(row[9] ?? 0) || 0)
      const sat = Math.round(Number(row[10] ?? 0) || 0)
      const existing = byWeek.get(weekSerial) ?? [0, 0, 0, 0, 0, 0, 0]
      existing[0] += sun
      existing[1] += mon
      existing[2] += tue
      existing[3] += wed
      existing[4] += thu
      existing[5] += fri
      existing[6] += sat
      byWeek.set(weekSerial, existing)
    }
    const weekStarts = [...byWeek.keys()].sort((a, b) => b - a)
    for (const serial of weekStarts) {
      const weekStart = excelSerialToWeekStart(serial)
      if (!weekStart) continue
      const days = byWeek.get(serial) ?? [0, 0, 0, 0, 0, 0, 0]
      const [sun, mon, tue, wed, thu, fri, sat] = days
      const total = sun + mon + tue + wed + thu + fri + sat
      const week: ExtractedWeek = { sun, mon, tue, wed, thu, fri, sat, total, weekStart }
      if (result.weeks.length === 0 && (result.trendCount != null || result.trendMult != null)) {
        if (result.trendCount != null) week.trafficCount = result.trendCount
        if (result.trendMult != null) week.trendMult = String(result.trendMult)
      }
      result.weeks.push(week)
    }
  }

  return result
}

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
  const [toast, setToast] = useState<string | null>(null)
  const [excelWeeks, setExcelWeeks] = useState<ExtractedWeek[]>([])
  const [excelError, setExcelError] = useState<string | null>(null)
  const [applyingExcel, setApplyingExcel] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [hourlyData, setHourlyData] = useState<Array<{ hour: number; dayOfWeek: number; avgCount: string | null; dailyTotal: string | null; pctOfDay: string | null }>>([])

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      try {
        const res = await fetch(`/api/traffic?storeId=${store.id}`, { cache: 'no-store' })
        if (res.ok) {
          const { weekly, hourly } = await res.json()
          setWeeklyData(Array.isArray(weekly) ? weekly : [])
          setHourlyData(Array.isArray(hourly) ? hourly : [])
        }
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [store.id])

  const latest = weeklyData[0]
  const trendMult =
    latest?.trendMult != null && latest.trendMult !== ''
      ? parseFloat(String(latest.trendMult))
      : null
  const trafficCountNum = latest?.trafficCount != null ? Number(latest.trafficCount) : null
  const totalNum = latest?.total != null ? Number(latest.total) : null
  const trendUp = trendMult !== null && trendMult >= 0.02
  const trendDown = trendMult !== null && trendMult <= -0.02
  const trendDirection = trendUp ? '▲ Trending Up' : trendDown ? '▼ Trending Down' : '→ Stable'

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

  // 5-week projection: next 5 Sundays from this week
  const availableWeeks = weeklyData.map((r) => r.weekStart).sort()
  const trendMultNum = trendMult ?? 0
  const fiveWeekStarts: string[] = []
  const now = new Date()
  const thisSunday = new Date(now)
  thisSunday.setDate(now.getDate() - now.getDay())
  for (let i = 0; i < 5; i++) {
    const d = new Date(thisSunday)
    d.setDate(thisSunday.getDate() + i * 7)
    fiveWeekStarts.push(d.toISOString().slice(0, 10))
  }
  const projectionRows = fiveWeekStarts.map((weekStart) => {
    const lyKey = findClosestLYWeek(weekStart, availableWeeks)
    const lyRow = weeklyData.find((r) => r.weekStart === lyKey)
    const lyDays = lyRow
      ? [Number(lyRow.sun ?? 0), Number(lyRow.mon ?? 0), Number(lyRow.tue ?? 0), Number(lyRow.wed ?? 0), Number(lyRow.thu ?? 0), Number(lyRow.fri ?? 0), Number(lyRow.sat ?? 0)]
      : [0, 0, 0, 0, 0, 0, 0]
    const lyTotal = lyDays.reduce((a, b) => a + b, 0)
    const projected = lyDays.map((t) => Math.max(0, t * (1 + trendMultNum)))
    const projTotal = projected.reduce((a, b) => a + b, 0)
    const shares = projTotal > 0 ? projected.map((p) => p / projTotal) : [1 / 7, 1 / 7, 1 / 7, 1 / 7, 1 / 7, 1 / 7, 1 / 7]
    return { weekStart, lyTotal, projTotal, shares }
  })

  // Peak traffic hours from hourly data (by dayOfWeek)
  const fmtHour = (h: number) => (h === 0 ? '12AM' : h < 12 ? `${h}AM` : h === 12 ? '12PM' : `${h - 12}PM`)
  const peakRows = [0, 1, 2, 3, 4, 5, 6].map((dow) => {
    const byHour = hourlyData
      .filter((r) => r.dayOfWeek === dow)
      .map((r) => ({ hour: r.hour, avg: Number(r.avgCount ?? 0) }))
      .sort((a, b) => b.avg - a.avg)
    const peak1 = byHour[0] ?? { hour: 12, avg: 0 }
    const peak2 = byHour[1] ?? { hour: 13, avg: 0 }
    const slow = byHour[byHour.length - 1] ?? { hour: 20, avg: 0 }
    const top3 = byHour.slice(0, 3).map((x) => x.hour).sort((a, b) => a - b)
    const winEnd = top3.length >= 2 ? Math.min((top3[top3.length - 1] ?? 20) + 1, 20) : 20
    const windowStr = top3.length >= 2 ? `${fmtHour(top3[0])} – ${fmtHour(winEnd)}` : '—'
    const dayTotal = byHour.reduce((s, x) => s + x.avg, 0)
    const top3Sum = byHour.slice(0, 3).reduce((s, x) => s + x.avg, 0)
    const pctOfDay = dayTotal > 0 ? top3Sum / dayTotal : 0
    return {
      day: DAYS[dow],
      peakHour: `${fmtHour(peak1.hour)} (${Math.round(peak1.avg)} avg)`,
      secondPeak: `${fmtHour(peak2.hour)} (${Math.round(peak2.avg)} avg)`,
      slowHour: fmtHour(slow.hour),
      busiestWindow: windowStr,
      pctOfDay,
    }
  })

  function getDefaultWeekStartForRow(rowIndex: number): string {
    const now = new Date()
    const sun = new Date(now)
    sun.setDate(now.getDate() - now.getDay())
    sun.setDate(sun.getDate() - rowIndex * 7)
    return sun.toISOString().slice(0, 10)
  }

  async function handleExcelFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    setExcelError(null)
    setExcelWeeks([])
    if (!file) return
    const name = (file.name || '').toLowerCase()
    if (!name.endsWith('.xlsx') && !name.endsWith('.xls')) {
      setExcelError('Please upload an Excel file (.xlsx or .xls).')
      return
    }
    try {
      const XLSX = await import('xlsx')
      const ab = await file.arrayBuffer()
      const wb = XLSX.read(ab, { type: 'array' })

      const trendFound = wb.SheetNames.some((n) => /last\s*5\s*weeks\s*traffic\s*trends/i.test(n))
      const histFound = wb.SheetNames.some((n) => /historical\s*week\s*data/i.test(n))
      if (trendFound && histFound) {
        type XLSXUtils = { utils: { sheet_to_json: (sheet: unknown, opts: { header: number; defval: string }) => (string | number)[][] } }
        const parsed = parseRetailTrafficWorkbook(wb, store, XLSX as XLSXUtils)
        if (parsed.weeks.length > 0) {
          setExcelWeeks(parsed.weeks)
          return
        }
      }

      const allWeeks: ExtractedWeek[] = []
      for (const sheetName of wb.SheetNames) {
        const sheet = wb.Sheets[sheetName] as unknown as Record<string, unknown>
        const weeks = extractWeeksFromSheet(sheet)
        for (const w of weeks) {
          const row = { ...w }
          if (!row.weekStart) row.weekStart = getWeekStartSunday(getDefaultWeekStartForRow(allWeeks.length))
          allWeeks.push(row)
        }
      }
      setExcelWeeks(allWeeks)
      if (allWeeks.length === 0) setExcelError('No valid week rows found. Use Retail Traffic Data Pulls_WB.xlsx format or sheets with Sun–Sat columns.')
    } catch (err) {
      setExcelError(err instanceof Error ? err.message : 'Failed to read Excel file.')
    }
  }

  async function handleApplyExcel() {
    if (excelWeeks.length === 0) return
    setApplyingExcel(true)
    setExcelError(null)
    try {
      const weeks = excelWeeks.map((w) => ({
        weekStart: w.weekStart ?? getWeekStartSunday(getDefaultWeekStartForRow(0)),
        sun: w.sun,
        mon: w.mon,
        tue: w.tue,
        wed: w.wed,
        thu: w.thu,
        fri: w.fri,
        sat: w.sat,
        total: w.total ?? w.sun + w.mon + w.tue + w.wed + w.thu + w.fri + w.sat,
        trendMult: w.trendMult,
        trafficCount: w.trafficCount,
      }))
      const res = await fetch('/api/traffic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeId: store.id, weeks }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error ?? `HTTP ${res.status}`)
      }
      // Refetch with cache bust so KPI cards and charts get the new data
      const fetchRes = await fetch(`/api/traffic?storeId=${store.id}&_=${Date.now()}`, { cache: 'no-store' })
      if (fetchRes.ok) {
        const { weekly, hourly } = await fetchRes.json()
        setWeeklyData(Array.isArray(weekly) ? weekly : [])
        setHourlyData(Array.isArray(hourly) ? hourly : [])
      }
      setExcelWeeks([])
      setToast(`Applied ${weeks.length} week(s). Daily breakdown, KPIs, and history updated.`)
      setTimeout(() => setToast(null), 3000)
    } catch (err) {
      setExcelError(err instanceof Error ? err.message : 'Failed to apply traffic data.')
    } finally {
      setApplyingExcel(false)
    }
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Traffic Data</h1>
        <p className="text-sm text-slate-500 mt-1">{store.name} · {store.city}</p>
      </div>

      {/* Trend card + stats (match image 3) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-slate-800/50 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-600 p-4 flex flex-col">
          <span className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">Trend mult</span>
          <div
            className={`mt-1 px-3 py-1.5 rounded-lg inline-block w-fit text-sm font-bold ${
              trendUp ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200' : trendDown ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200' : 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200'
            }`}
          >
            {trendMult !== null ? `${(trendMult * 100).toFixed(2)}%` : '—'}
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400 mt-2">{trendDirection}</span>
          <span className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
            Updated: {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
        </div>
        <StatCard
          label="Traffic count"
          value={trafficCountNum != null ? trafficCountNum.toLocaleString() : '—'}
          accentColor={store.color}
          icon={<Users className="w-4 h-4" />}
        />
        <StatCard
          label="Peak day"
          value={getPeakDay()}
          accentColor={store.color}
          icon={<Clock className="w-4 h-4" />}
        />
        <StatCard
          label="Weekly total"
          value={totalNum != null ? totalNum.toLocaleString() : '—'}
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

        {/* Upload Excel */}
        <div className="bg-white dark:bg-slate-800/50 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-600 p-5">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-1">Upload Excel</h2>
          <p className="text-xs text-slate-400 dark:text-slate-400 mb-3">
            <strong>Retail Traffic Data Pulls_WB.xlsx</strong> is read automatically: <em>Last 5 Weeks Traffic Trends</em> (traffic count + trend for this store) and <em>Historical Week Data - Last Com</em> (53 weeks). Data applies to the store you’re viewing and updates the daily breakdown, KPI cards, 53-week history, and 5-week projection.
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleExcelFile}
            className="hidden"
          />
          <div className="border-2 border-dashed border-slate-200 dark:border-slate-600 rounded-xl bg-slate-50/50 dark:bg-slate-800/50 p-4">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Choose file…
            </button>
            {excelError && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{excelError}</p>}
            {excelWeeks.length > 0 && (
              <>
                <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                  {excelWeeks.length} week(s) extracted. Review and apply to update traffic.
                </p>
                <div className="mt-2 max-h-32 overflow-y-auto text-xs text-slate-600 dark:text-slate-300">
                  {excelWeeks.slice(0, 5).map((w, i) => (
                    <div key={i}>
                      {w.weekStart ?? '—'} · Sun–Sat: {[w.sun, w.mon, w.tue, w.wed, w.thu, w.fri, w.sat].join(', ')}
                    </div>
                  ))}
                  {excelWeeks.length > 5 && <div className="text-slate-400">… and {excelWeeks.length - 5} more</div>}
                </div>
                <button
                  type="button"
                  onClick={handleApplyExcel}
                  disabled={applyingExcel}
                  className="mt-3 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                  style={{ backgroundColor: store.color }}
                >
                  {applyingExcel && <Loader2 className="w-4 h-4 animate-spin" />}
                  Apply {excelWeeks.length} week(s) to traffic
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 5-week projection + Peak hours + 53-week history */}
      <div className="mt-6 grid lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-800/50 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-600 p-5">
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-3">5-Week Projection</h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[320px] text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-600">
                    <th className="text-left py-2 px-2 text-slate-500 dark:text-slate-400">Metric</th>
                    {projectionRows.map((_, i) => (
                      <th key={i} className="text-center py-2 px-1 font-medium text-slate-600 dark:text-slate-300">
                        Week {i + 1}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-slate-100 dark:border-slate-700">
                    <td className="py-1.5 px-2 text-slate-500 dark:text-slate-400">Week date</td>
                    {projectionRows.map((r, i) => (
                      <td key={i} className="py-1.5 px-1 text-center text-slate-700 dark:text-slate-200">
                        {new Date(r.weekStart + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-slate-100 dark:border-slate-700">
                    <td className="py-1.5 px-2 text-slate-500 dark:text-slate-400">LY traffic</td>
                    {projectionRows.map((r, i) => (
                      <td key={i} className="py-1.5 px-1 text-center text-slate-700 dark:text-slate-200">
                        {Math.round(r.lyTotal).toLocaleString()}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-slate-100 dark:border-slate-700">
                    <td className="py-1.5 px-2 text-slate-500 dark:text-slate-400">Projected</td>
                    {projectionRows.map((r, i) => (
                      <td key={i} className="py-1.5 px-1 text-center font-medium text-green-700 dark:text-green-400">
                        {Math.round(r.projTotal).toLocaleString()}
                      </td>
                    ))}
                  </tr>
                  {DAYS.map((day, d) => (
                    <tr key={day} className="border-b border-slate-100 dark:border-slate-700">
                      <td className="py-1 px-2 text-slate-500 dark:text-slate-400">{day} %</td>
                      {projectionRows.map((r, i) => (
                        <td key={i} className="py-1 px-1 text-center text-slate-600 dark:text-slate-300">
                          {(r.shares[d] * 100).toFixed(0)}%
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800/50 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-600 p-5">
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-3">Peak Traffic Hours</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">Based on historical hourly data</p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-600">
                    <th className="text-left py-2 px-2 text-slate-500 dark:text-slate-400">Day</th>
                    <th className="text-left py-2 px-2 text-slate-500 dark:text-slate-400">Peak hour</th>
                    <th className="text-left py-2 px-2 text-slate-500 dark:text-slate-400">2nd peak</th>
                    <th className="text-left py-2 px-2 text-slate-500 dark:text-slate-400">Slow hour</th>
                    <th className="text-left py-2 px-2 text-slate-500 dark:text-slate-400">Busiest window</th>
                    <th className="text-right py-2 px-2 text-slate-500 dark:text-slate-400">% of day</th>
                  </tr>
                </thead>
                <tbody>
                  {peakRows.map((row) => (
                    <tr key={row.day} className="border-b border-slate-50 dark:border-slate-700">
                      <td className="py-2 px-2 font-medium text-slate-700 dark:text-slate-200">{row.day}</td>
                      <td className="py-2 px-2 text-slate-600 dark:text-slate-300">{row.peakHour}</td>
                      <td className="py-2 px-2 text-slate-600 dark:text-slate-300">{row.secondPeak}</td>
                      <td className="py-2 px-2 text-slate-600 dark:text-slate-300">{row.slowHour}</td>
                      <td className="py-2 px-2 font-medium text-green-700 dark:text-green-400">{row.busiestWindow}</td>
                      <td className="py-2 px-2 text-right font-medium text-green-700 dark:text-green-400">
                        {(row.pctOfDay * 100).toFixed(0)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        {weeklyData.length > 0 && (
          <div className="bg-white dark:bg-slate-800/50 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-600 p-5">
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-4">53 Week Traffic History</h2>
            <div className="overflow-x-auto max-h-[480px] overflow-y-auto">
              <table className="w-full min-w-[600px] text-xs">
                <thead className="sticky top-0 bg-white dark:bg-slate-800 z-10">
                  <tr className="border-b border-slate-100 dark:border-slate-600">
                    <th className="text-left py-2 px-3 text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-300">
                      Week of
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
                  {weeklyData.slice(0, 53).map((row) => (
                    <tr key={row.id} className="border-b border-slate-50 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/30">
                      <td className="py-2 px-3 font-medium text-slate-700 dark:text-slate-200">
                        {new Date(row.weekStart + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      {DAY_KEYS.map((k) => (
                        <td key={k} className="py-2 px-2 text-center text-slate-600 dark:text-slate-300">
                          {Number(row[k] ?? 0).toLocaleString()}
                        </td>
                      ))}
                      <td className="py-2 px-3 text-center font-semibold text-green-700 dark:text-green-400">
                        {Number(row.total ?? 0).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {toast && (
        <div className="fixed bottom-4 right-4 z-50 bg-green-600 text-white px-4 py-3 rounded-xl shadow-lg text-sm font-medium">
          {toast}
        </div>
      )}
    </div>
  )
}
