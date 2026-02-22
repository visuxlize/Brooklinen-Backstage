'use client'

import { useState, useEffect, useRef } from 'react'
import { TrendingUp, TrendingDown, Clock, Users, Loader2, FileSpreadsheet } from 'lucide-react'
import { StatCard } from '@/components/ui/StatCard'
import type { StoreConfig } from '@/lib/stores'
import {
  computeFiveWeekProjection,
  computePeakHoursSummary,
  formatHour,
  type WeeklyTrafficRow,
  type HourlyTrafficRow,
} from '@/lib/trafficCalculations'
import {
  parseTrafficExcel,
  buildUploadResult,
  storeNameMatches,
  type TrafficUploadResult,
} from '@/lib/trafficExcelParser'

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

/** Match "Last 5 Weeks Traffic Trends" or "Last 5Weeks Traffic trend" (Williamsburg-style). */
function isTrendSheetName(name: string): boolean {
  return /last\s*5\s*weeks?\s*traffic\s*trends?/i.test(name)
}

/** Match "Historical Week Data" or "Historical of 53Week Data - Last 53weeks" (Williamsburg-style). */
function isHistSheetName(name: string): boolean {
  return /historical.*week.*data/i.test(name) || /\d+\s*week.*data/i.test(name)
}

/**
 * Parse "Retail Traffic Data Pulls" format (WB or Williamsburg):
 * - Trend sheet: Store Name, Traffic Count, Recent Trend Multiplier (row per store). Columns detected by header.
 * - Historical sheet: Store, Week (Excel serial or date), then Sun–Sat. Columns detected by header.
 */
function parseRetailTrafficWorkbook(
  wb: { SheetNames: string[]; Sheets: Record<string, unknown> },
  store: StoreConfig,
  XLSX: { utils: { sheet_to_json: (sheet: unknown, opts: { header: number; defval: string }) => (string | number)[][] } }
): { weeks: ExtractedWeek[]; trendCount?: number; trendMult?: number } {
  const result: { weeks: ExtractedWeek[]; trendCount?: number; trendMult?: number } = { weeks: [] }

  const trendSheetName = wb.SheetNames.find(isTrendSheetName)
  const histSheetName = wb.SheetNames.find(isHistSheetName)

  if (trendSheetName) {
    const sheet = wb.Sheets[trendSheetName]
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as (string | number)[][]
    const header = (rows[0] ?? []).map((c) => String(c ?? '').toLowerCase())
    const storeCol = header.findIndex((h) => /store|name|location/i.test(h))
    const countCol = header.findIndex((h) => /traffic|count/i.test(h))
    const trendCol = header.findIndex((h) => /trend|mult/i.test(h))
    const dataStart = header.some((h) => /store|name|traffic|count|trend/i.test(h)) ? 1 : 2
    for (let i = dataStart; i < rows.length; i++) {
      const row = rows[i] ?? []
      const excelStore = (storeCol >= 0 && row[storeCol] != null ? String(row[storeCol]).trim() : String(row[0] ?? '').trim())
      if (!storeMatchesExcelName(store, excelStore)) continue
      const countVal = countCol >= 0 ? row[countCol] : row[1]
      const trendValRaw = trendCol >= 0 ? row[trendCol] : row[2]
      const trafficCount = countVal != null && countVal !== '' ? Math.round(Number(countVal)) : undefined
      const trendVal = trendValRaw != null && trendValRaw !== '' ? Number(trendValRaw) : undefined
      if (trafficCount != null && !Number.isNaN(trafficCount)) result.trendCount = trafficCount
      if (trendVal != null && !Number.isNaN(trendVal)) result.trendMult = trendVal
      break
    }
  }

  if (histSheetName) {
    const sheet = wb.Sheets[histSheetName]
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as (string | number)[][]
    const header = (rows[0] ?? []).map((c) => String(c ?? '').toLowerCase())
    const storeCol = header.findIndex((h) => /store|name|location/i.test(h))
    const weekCol = header.findIndex((h) => /week|date|start/i.test(h))
    const dayCols = DAY_HEADERS_LOWER.map((d) => header.findIndex((h) => h.includes(d.slice(0, 3)) || d.startsWith(h.slice(0, 2))))
    const hasAllDays = dayCols.every((c) => c >= 0)
    const dataStart = header.some((h) => /store|week|sun|mon/i.test(h)) ? 1 : 2
    const useStoreCol = storeCol >= 0 ? storeCol : 0
    const useWeekCol = weekCol >= 0 ? weekCol : 1
    const useDayCols = hasAllDays ? dayCols : [4, 5, 6, 7, 8, 9, 10]

    const byWeek = new Map<string, number[]>()
    for (let i = dataStart; i < rows.length; i++) {
      const row = rows[i] ?? []
      const excelStore = (row[useStoreCol] != null ? String(row[useStoreCol]).trim() : '')
      if (!storeMatchesExcelName(store, excelStore)) continue
      const weekVal = row[useWeekCol]
      let weekStart: string | null = null
      if (typeof weekVal === 'number' && !Number.isNaN(weekVal)) weekStart = excelSerialToWeekStart(weekVal)
      else if (typeof weekVal === 'string') {
        const parsed = parseDateString(String(weekVal).trim().slice(0, 30))
        weekStart = parsed ? getWeekStartSunday(parsed) : null
      }
      if (!weekStart) continue
      const sun = Math.round(Number(row[useDayCols[0]] ?? 0) || 0)
      const mon = Math.round(Number(row[useDayCols[1]] ?? 0) || 0)
      const tue = Math.round(Number(row[useDayCols[2]] ?? 0) || 0)
      const wed = Math.round(Number(row[useDayCols[3]] ?? 0) || 0)
      const thu = Math.round(Number(row[useDayCols[4]] ?? 0) || 0)
      const fri = Math.round(Number(row[useDayCols[5]] ?? 0) || 0)
      const sat = Math.round(Number(row[useDayCols[6]] ?? 0) || 0)
      const existing = byWeek.get(weekStart) ?? [0, 0, 0, 0, 0, 0, 0]
      existing[0] += sun
      existing[1] += mon
      existing[2] += tue
      existing[3] += wed
      existing[4] += thu
      existing[5] += fri
      existing[6] += sat
      byWeek.set(weekStart, existing)
    }
    const weekStarts = [...byWeek.keys()].sort((a, b) => b.localeCompare(a))
    for (const weekStart of weekStarts) {
      const days = byWeek.get(weekStart) ?? [0, 0, 0, 0, 0, 0, 0]
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
  const [uploadResult, setUploadResult] = useState<TrafficUploadResult | null>(null)

  const [hourlyData, setHourlyData] = useState<Array<{ hour: number; dayOfWeek: number; avgCount: string | null; dailyTotal: string | null; pctOfDay: string | null }>>([])

  useEffect(() => {
    setUploadResult(null)
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
  function getPeakDayFromApi(): string {
    if (!latest) return '—'
    const vals = DAY_KEYS.map((k, i) => ({ day: DAYS[i], val: Number(latest[k] ?? 0) }))
    const peak = vals.reduce((a, b) => (b.val > a.val ? b : a), vals[0])
    return peak.val > 0 ? peak.day : '—'
  }

  const trendMultDisplay = uploadResult != null ? uploadResult.trendMultiplier : trendMult
  const trafficCountDisplay = uploadResult != null ? uploadResult.trafficCount : trafficCountNum
  const totalNumDisplay = uploadResult != null ? uploadResult.weeklyTotal : totalNum
  const peakDayDisplay = uploadResult != null ? uploadResult.peakDay : getPeakDayFromApi()
  const trendUp = trendMultDisplay !== null && trendMultDisplay >= 0.02
  const trendDown = trendMultDisplay !== null && trendMultDisplay <= -0.02
  const trendDirection = trendUp ? '▲ Trending Up' : trendDown ? '▼ Trending Down' : '→ Stable'

  const recentWeekBreakdownDisplay = uploadResult
    ? uploadResult.recentWeekBreakdown
    : latest
      ? ([Number(latest.sun ?? 0), Number(latest.mon ?? 0), Number(latest.tue ?? 0), Number(latest.wed ?? 0), Number(latest.thu ?? 0), Number(latest.fri ?? 0), Number(latest.sat ?? 0)] as const)
      : null
  const weekMax = recentWeekBreakdownDisplay
    ? Math.max(...recentWeekBreakdownDisplay)
    : 0

  // SECTION 1: 5-Week Projection — schedule weeks = next 5 Sundays
  const now = new Date()
  const thisSunday = new Date(now)
  thisSunday.setDate(now.getDate() - now.getDay())
  const scheduleWeeks: string[] = []
  for (let i = 0; i < 5; i++) {
    const d = new Date(thisSunday)
    d.setDate(thisSunday.getDate() + i * 7)
    scheduleWeeks.push(d.toISOString().slice(0, 10))
  }
  const weeklyHistory: WeeklyTrafficRow[] = weeklyData.map((r) => ({
    weekStart: r.weekStart,
    sun: r.sun,
    mon: r.mon,
    tue: r.tue,
    wed: r.wed,
    thu: r.thu,
    fri: r.fri,
    sat: r.sat,
    total: r.total,
    trendMult: r.trendMult,
    trafficCount: r.trafficCount,
  }))
  const trendData = {
    trendMultiplier: trendMult ?? 0,
    recentCount: trafficCountNum ?? null,
  }
  const projectionRowsApi = computeFiveWeekProjection(weeklyHistory, trendData, scheduleWeeks)
  const projectionRowsDisplay =
    uploadResult != null
      ? uploadResult.projections.map((p) => ({
          weekStart: p.weekStart,
          lyTotal: p.lyTotal,
          projectedTotal: p.projTotal,
          dayShares: p.dayShares,
        }))
      : projectionRowsApi

  // SECTION 2: Peak Hours Summary — from API (hour 10–20) or from upload (hourlyByDay)
  const hourlyRows: HourlyTrafficRow[] = hourlyData.map((r) => ({
    hour: r.hour,
    dayOfWeek: r.dayOfWeek,
    avgCount: r.avgCount != null ? Number(r.avgCount) : null,
    dailyTotal: r.dailyTotal != null ? Number(r.dailyTotal) : null,
    pctOfDay: r.pctOfDay != null ? Number(r.pctOfDay) : null,
  }))
  const peakResults = computePeakHoursSummary(hourlyRows, DAYS)
  const peakRowsApi = peakResults.map((p) => ({
    day: p.dayName,
    peakHour: `${formatHour(p.peakHour)} (${Math.round(p.peakAvg)} avg)`,
    secondPeak: `${formatHour(p.secondPeakHour)} (${Math.round(p.secondPeakAvg)} avg)`,
    slowHour: formatHour(p.slowHour),
    busiestWindow: `${formatHour(p.busiestWindowStart)} – ${formatHour(p.busiestWindowEnd)}`,
    pctOfDay: p.windowPctOfDay,
  }))
  const peakRowsDisplay =
    uploadResult != null
      ? uploadResult.peakHours.map((p) => ({
          day: p.day,
          peakHour: p.peak1,
          secondPeak: p.peak2,
          slowHour: p.slowHour,
          busiestWindow: p.busyWindow,
          pctOfDay: parseInt(p.windowPct, 10) / 100,
        }))
      : peakRowsApi

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
    setUploadResult(null)
    if (!file) return
    const name = (file.name || '').toLowerCase()
    if (!name.endsWith('.xlsx') && !name.endsWith('.xls')) {
      setExcelError('Please upload an Excel file (.xlsx or .xls).')
      return
    }
    try {
      const XLSX = await import('xlsx')
      const ab = await file.arrayBuffer()
      const wb = XLSX.read(ab, { type: 'array', cellDates: true })

      const parsed = parseTrafficExcel(wb, XLSX.utils)
      if (parsed) {
        if (!storeNameMatches(parsed.storeName, store.id, store.name)) {
          setExcelError(`This file is for "${parsed.storeName}". Upload a file for ${store.name} (e.g. Retail_Traffic_Data_Pulls_${store.name.replace(/\s+/g, '_')}.xlsx).`)
          return
        }
        const result = buildUploadResult(parsed)
        setUploadResult(result)

        const weeks = result.historyTable.map((row) => {
          const [sun, mon, tue, wed, thu, fri, sat] = row.days
          const isMostRecent = row.weekOf === result.mostRecentWeek
          return {
            weekStart: row.weekOf,
            sun,
            mon,
            tue,
            wed,
            thu,
            fri,
            sat,
            total: row.total,
            ...(isMostRecent && { trendMult: String(result.trendMultiplier), trafficCount: result.trafficCount }),
          }
        })
        const res = await fetch('/api/traffic', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ storeId: store.id, weeks }),
        })
        if (res.ok) {
          const fetchRes = await fetch(`/api/traffic?storeId=${store.id}&_=${Date.now()}`, { cache: 'no-store' })
          if (fetchRes.ok) {
            const { weekly, hourly } = await fetchRes.json()
            setWeeklyData(Array.isArray(weekly) ? weekly : [])
            setHourlyData(Array.isArray(hourly) ? hourly : [])
          }
          setToast('Traffic data updated. All sections reflect the uploaded file.')
        } else {
          setToast('Display updated from file. Save to server failed — try again.')
        }
        setTimeout(() => setToast(null), 4000)
        return
      }

      const trendFound = wb.SheetNames.some(isTrendSheetName)
      const histFound = wb.SheetNames.some(isHistSheetName)
      type XLSXUtils = { utils: { sheet_to_json: (sheet: unknown, opts: { header: number; defval: string }) => (string | number)[][] } }
      const legacyParsed = (trendFound || histFound) ? parseRetailTrafficWorkbook(wb, store, XLSX as XLSXUtils) : { weeks: [] }
      if (legacyParsed.weeks.length > 0) {
        setExcelWeeks(legacyParsed.weeks)
        return
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
      if (allWeeks.length > 0 && (legacyParsed.trendCount != null || legacyParsed.trendMult != null)) {
        const first = { ...allWeeks[0] }
        if (legacyParsed.trendCount != null) first.trafficCount = legacyParsed.trendCount
        if (legacyParsed.trendMult != null) first.trendMult = String(legacyParsed.trendMult)
        allWeeks[0] = first
      }
      setExcelWeeks(allWeeks)
      if (allWeeks.length === 0) setExcelError('No valid week rows found. Use Retail Traffic Data Pulls format with "Last 5 Weeks Traffic Trends" and "Historical Week Data - Last Com".')
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

      {/* Section 1: KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-slate-800/50 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-600 p-4 flex flex-col">
          <span className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">TREND MULT</span>
          <div
            className={`mt-1 px-3 py-1.5 rounded-lg inline-block w-fit text-sm font-bold ${
              trendUp ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200' : trendDown ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200' : 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200'
            }`}
          >
            {trendMultDisplay != null ? `${(trendMultDisplay * 100).toFixed(2)}%` : '—'}
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400 mt-2">{trendDirection}</span>
          <span className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
            Drives 5-week projection below · Updated: {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
        </div>
        <StatCard
          label="TRAFFIC COUNT"
          value={trafficCountDisplay != null ? trafficCountDisplay.toLocaleString() : '—'}
          subValue="Last 5 weeks (current period)"
          accentColor={store.color}
          icon={<Users className="w-4 h-4" />}
        />
        <StatCard
          label="PEAK DAY"
          value={peakDayDisplay}
          accentColor={store.color}
          icon={<Clock className="w-4 h-4" />}
        />
        <StatCard
          label="WEEKLY TOTAL"
          value={totalNumDisplay != null ? totalNumDisplay.toLocaleString() : '—'}
          accentColor={store.color}
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Bar chart */}
        <div className="bg-white dark:bg-slate-800/50 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-600 p-5">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-1">Daily Traffic Breakdown</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Most recent week · Sun–Sat counts</p>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="h-8 bg-slate-100 dark:bg-slate-700 rounded animate-pulse" />
              ))}
            </div>
          ) : !recentWeekBreakdownDisplay ? (
            <div className="text-center py-12 text-slate-400 dark:text-slate-400 text-sm">No traffic data yet</div>
          ) : (
            <div className="space-y-2">
              {DAYS.map((day, i) => {
                const val = recentWeekBreakdownDisplay[i] ?? 0
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
            Upload a file named for this store, e.g. <em>Retail_Traffic_Data_Pulls_{store.name.replace(/\s+/g, '_')}.xlsx</em>. Must include sheets: <strong>Last 5 Weeks Traffic Trends</strong> (row 3 = store, traffic count, trend) and <strong>Historical Week Data - Last Com</strong> (53 weeks × 11 hours). All sections update automatically.
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

      {/* 5-week projection (Apps Script: refreshProjectionRows — LY week + trend → projected, day % shares) + Peak hours + 53-week history */}
      <div className="mt-6 grid lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-800/50 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-600 overflow-hidden">
            <div className="bg-emerald-700 px-4 py-2">
              <h2 className="text-sm font-bold text-white uppercase tracking-wide">5-Week Projection</h2>
              <p className="text-xs text-emerald-100 mt-0.5">LY traffic × (1 + trend) → projected; day % = share of projected week</p>
            </div>
            <div className="p-4 overflow-x-auto">
              <table className="w-full min-w-[320px] text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-600">
                    <th className="text-left py-2 px-2 text-slate-500 dark:text-slate-400 font-semibold">Metric</th>
                    {projectionRowsDisplay.map((r, i) => (
                      <th key={i} className="text-center py-2 px-1 font-semibold text-slate-700 dark:text-slate-200">
                        Week {i + 1}<br />
                        <span className="font-normal text-slate-500 dark:text-slate-400">
                          {new Date(r.weekStart + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-slate-100 dark:border-slate-700">
                    <td className="py-1.5 px-2 text-slate-500 dark:text-slate-400 font-medium">LY Traffic</td>
                    {projectionRowsDisplay.map((r, i) => (
                      <td key={i} className="py-1.5 px-1 text-center text-blue-700 dark:text-blue-400 font-medium">
                        {r.lyTotal === 0 ? '—' : Math.round(r.lyTotal).toLocaleString()}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-slate-100 dark:border-slate-700 bg-emerald-50/50 dark:bg-emerald-900/20">
                    <td className="py-1.5 px-2 text-slate-600 dark:text-slate-300 font-medium">Projected Traffic</td>
                    {projectionRowsDisplay.map((r, i) => (
                      <td key={i} className="py-1.5 px-1 text-center font-bold text-emerald-800 dark:text-emerald-300">
                        {Math.round(r.projectedTotal).toLocaleString()}
                      </td>
                    ))}
                  </tr>
                  {DAYS.map((day, d) => (
                    <tr key={day} className={`border-b border-slate-100 dark:border-slate-700 ${d % 2 === 0 ? 'bg-slate-50/50 dark:bg-slate-800/50' : ''}`}>
                      <td className="py-1 px-2 text-slate-500 dark:text-slate-400">{day} %</td>
                      {projectionRowsDisplay.map((r, i) => (
                        <td key={i} className="py-1 px-1 text-center text-slate-600 dark:text-slate-300">
                          {(r.dayShares[d] * 100).toFixed(0)}%
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800/50 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-600 overflow-hidden">
            <div className="bg-emerald-700 px-4 py-2">
              <h2 className="text-sm font-bold text-white uppercase tracking-wide">Peak Traffic Hours</h2>
              <p className="text-xs text-emerald-100 mt-0.5">Based on historical hourly data</p>
            </div>
            <div className="p-4 overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-600">
                    <th className="text-left py-2 px-2 text-slate-500 dark:text-slate-400">Day</th>
                    <th className="text-left py-2 px-2 text-slate-500 dark:text-slate-400">Peak hour</th>
                    <th className="text-left py-2 px-2 text-slate-500 dark:text-slate-400">2nd peak</th>
                    <th className="text-left py-2 px-2 text-slate-500 dark:text-slate-400">Slow hour</th>
                    <th className="text-left py-2 px-2 text-slate-500 dark:text-slate-400">Busiest window</th>
                    <th className="text-right py-2 px-2 text-slate-500 dark:text-slate-400">% of Daily Traffic</th>
                  </tr>
                </thead>
                <tbody>
                  {peakRowsDisplay.map((row, ri) => (
                    <tr key={row.day} className={`border-b border-slate-100 dark:border-slate-700 ${ri % 2 === 0 ? 'bg-slate-50/50 dark:bg-slate-800/50' : ''}`}>
                      <td className="py-2 px-2 font-medium text-slate-700 dark:text-slate-200">{row.day}</td>
                      <td className="py-2 px-2 font-medium text-orange-700 dark:text-orange-400">{row.peakHour}</td>
                      <td className="py-2 px-2 text-slate-600 dark:text-slate-300">{row.secondPeak}</td>
                      <td className="py-2 px-2 text-slate-600 dark:text-slate-300">{row.slowHour}</td>
                      <td className="py-2 px-2 font-semibold text-teal-700 dark:text-teal-400">{row.busiestWindow}</td>
                      <td className="py-2 px-2 text-right font-bold text-slate-800 dark:text-slate-100">
                        {(row.pctOfDay * 100).toFixed(0)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        {((uploadResult ? uploadResult.historyTable.length > 0 : weeklyData.length > 0) && (
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
                  {uploadResult
                    ? uploadResult.historyTable.slice(0, 53).map((row) => {
                        const avgTotal =
                          uploadResult.historyTable.length > 0
                            ? uploadResult.historyTable.reduce((s, r) => s + r.total, 0) / uploadResult.historyTable.length
                            : 0
                        const isAboveAvg = row.total > avgTotal
                        return (
                          <tr
                            key={row.weekOf}
                            className={`border-b border-slate-50 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/30 ${isAboveAvg ? 'font-medium' : ''}`}
                          >
                            <td className="py-2 px-3 font-medium text-slate-700 dark:text-slate-200">
                              {new Date(row.weekOf + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </td>
                            {row.days.map((val, k) => (
                              <td key={k} className="py-2 px-2 text-center text-slate-600 dark:text-slate-300">
                                {val.toLocaleString()}
                              </td>
                            ))}
                            <td className={`py-2 px-3 text-center font-semibold ${isAboveAvg ? 'text-green-700 dark:text-green-400' : 'text-slate-700 dark:text-slate-300'}`}>
                              {row.total.toLocaleString()}
                            </td>
                          </tr>
                        )
                      })
                    : weeklyData.slice(0, 53).map((row) => (
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
        ))}
      </div>

      {toast && (
        <div className="fixed bottom-4 right-4 z-50 bg-green-600 text-white px-4 py-3 rounded-xl shadow-lg text-sm font-medium">
          {toast}
        </div>
      )}
    </div>
  )
}
