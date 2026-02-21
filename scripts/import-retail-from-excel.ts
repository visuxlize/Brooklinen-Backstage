/**
 * Import from RetailDatas.xlsx:
 *   - Retail Data sheet → retail_data (Budget, LY Budget)
 *   - Traffic Data sheet → traffic_weekly (weekly Sun–Sat + optional trend)
 *   - Peak hours / Hourly Traffic sheet → hourly_traffic
 *
 * Usage: npx tsx scripts/import-retail-from-excel.ts <path-to-workbook.xlsx>
 * From project root so .env.local is loaded (or use: npx dotenv -e .env.local -- tsx scripts/import-retail-from-excel.ts ...)
 */
import './load-env'
import XLSX from 'xlsx'
import { db } from '../lib/db'
import { retailData, trafficWeekly, hourlyTraffic } from '../lib/db/schema'
import { sql } from 'drizzle-orm'

function excelDateToISO(serial: number): string {
  const date = new Date((serial - 25569) * 86400 * 1000)
  return date.toISOString().slice(0, 10)
}

function parseStoreId(storeCell: string): number | null {
  const match = String(storeCell ?? '').trim().match(/^(\d+)/)
  return match ? parseInt(match[1], 10) : null
}

function toWeekStart(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  const day = d.getDay()
  const diff = d.getDate() - day
  d.setDate(diff)
  return d.toISOString().slice(0, 10)
}

async function importRetailData(wb: XLSX.WorkBook): Promise<void> {
  const sheetName = wb.SheetNames.find((n) => n === 'Retail Data' || /retail/i.test(n))
  if (!sheetName) {
    console.log('No Retail Data sheet found; skipping retail import.')
    return
  }
  const sheet = wb.Sheets[sheetName]
  const rows = XLSX.utils.sheet_to_json<(string | number)[]>(sheet, { header: 1 }) as (string | number)[][]
  const header = (rows[0] ?? []) as string[]
  const storeIdx = header.findIndex((c) => /store/i.test(String(c)))
  const dateIdx = header.findIndex((c) => /date/i.test(String(c)))
  const budgetIdx = header.findIndex((c) => /budget|net revenue budget/i.test(String(c)))
  const lyIdx = header.findIndex((c) => /ly|last year|net revenue ly/i.test(String(c)))

  if (storeIdx < 0 || dateIdx < 0 || budgetIdx < 0) {
    console.log('Retail sheet missing Store/Date/Budget columns; skipping.')
    return
  }

  let n = 0
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]
    if (!row || row.length < Math.max(storeIdx, dateIdx, budgetIdx)) continue
    const storeId = parseStoreId(String(row[storeIdx] ?? ''))
    if (!storeId) continue
    const dateVal = row[dateIdx]
    let dateStr: string
    if (typeof dateVal === 'number') dateStr = excelDateToISO(dateVal)
    else if (typeof dateVal === 'string') dateStr = dateVal.slice(0, 10)
    else continue
    const budget = row[budgetIdx] != null && row[budgetIdx] !== '' ? Number(row[budgetIdx]) : null
    const ly = lyIdx >= 0 && row[lyIdx] != null && row[lyIdx] !== '' ? Number(row[lyIdx]) : null
    if (budget == null || Number.isNaN(budget)) continue

    await db
      .insert(retailData)
      .values({
        storeId,
        date: dateStr,
        budgetNet: String(budget),
        lyNet: ly != null && !Number.isNaN(ly) ? String(ly) : null,
      })
      .onConflictDoUpdate({
        target: [retailData.storeId, retailData.date],
        set: { budgetNet: sql`excluded.budget_net`, lyNet: sql`excluded.ly_net` },
      })
    n++
  }
  console.log(`Retail data: imported ${n} rows.`)
}

async function importTrafficData(wb: XLSX.WorkBook): Promise<void> {
  const sheetName = wb.SheetNames.find((n) => n === 'Traffic Data' || (/traffic/i.test(n) && !/hourly|peak/i.test(n)))
  if (!sheetName) {
    console.log('No Traffic Data sheet found; skipping traffic weekly import.')
    return
  }
  const sheet = wb.Sheets[sheetName]
  const rows = XLSX.utils.sheet_to_json<(string | number)[]>(sheet, { header: 1 }) as (string | number)[][]
  const header = (rows[0] ?? []) as string[]
  const storeIdx = header.findIndex((c) => /store/i.test(String(c)))
  const weekIdx = header.findIndex((c) => /week|date/i.test(String(c)))
  const dayCol = (d: string) => header.findIndex((c) => new RegExp(d, 'i').test(String(c)))
  const sun = dayCol('sun') >= 0 ? dayCol('sun') : header.findIndex((c) => /^sunday|sun$/i.test(String(c)))
  const mon = dayCol('mon') >= 0 ? dayCol('mon') : header.findIndex((c) => /^monday|mon$/i.test(String(c)))
  const tue = dayCol('tue') >= 0 ? dayCol('tue') : header.findIndex((c) => /^tuesday|tue$/i.test(String(c)))
  const wed = dayCol('wed') >= 0 ? dayCol('wed') : header.findIndex((c) => /^wednesday|wed$/i.test(String(c)))
  const thu = dayCol('thu') >= 0 ? dayCol('thu') : header.findIndex((c) => /^thursday|thu$/i.test(String(c)))
  const fri = dayCol('fri') >= 0 ? dayCol('fri') : header.findIndex((c) => /^friday|fri$/i.test(String(c)))
  const sat = dayCol('sat') >= 0 ? dayCol('sat') : header.findIndex((c) => /^saturday|sat$/i.test(String(c)))

  if (storeIdx < 0 || weekIdx < 0 || sun < 0) {
    console.log('Traffic sheet missing Store / Week / day columns; skipping.')
    return
  }

  const dayIndexes = [sun, mon, tue, wed, thu, fri, sat].filter((i) => i >= 0)
  if (dayIndexes.length < 7) {
    console.log('Traffic sheet: need all 7 day columns (Sun–Sat); skipping.')
    return
  }

  let n = 0
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]
    if (!row) continue
    const storeId = parseStoreId(String(row[storeIdx] ?? ''))
    if (!storeId) continue
    const weekVal = row[weekIdx]
    let weekStartStr: string
    if (typeof weekVal === 'number') weekStartStr = toWeekStart(excelDateToISO(weekVal))
    else if (typeof weekVal === 'string') weekStartStr = toWeekStart(weekVal.slice(0, 10))
    else continue
    const days = dayIndexes.map((idx) => Math.round(Number(row[idx]) || 0))
    const total = days.reduce((a, b) => a + b, 0)

    await db
      .insert(trafficWeekly)
      .values({
        storeId,
        weekStart: weekStartStr,
        sun: days[0],
        mon: days[1],
        tue: days[2],
        wed: days[3],
        thu: days[4],
        fri: days[5],
        sat: days[6],
        total,
        trafficCount: total,
      })
      .onConflictDoUpdate({
        target: [trafficWeekly.storeId, trafficWeekly.weekStart],
        set: {
          sun: sql`excluded.sun`,
          mon: sql`excluded.mon`,
          tue: sql`excluded.tue`,
          wed: sql`excluded.wed`,
          thu: sql`excluded.thu`,
          fri: sql`excluded.fri`,
          sat: sql`excluded.sat`,
          total: sql`excluded.total`,
          trafficCount: sql`excluded.traffic_count`,
        },
      })
    n++
  }
  console.log(`Traffic weekly: imported ${n} rows.`)
}

async function importHourlyData(wb: XLSX.WorkBook): Promise<void> {
  const sheetName = wb.SheetNames.find((n) => n === 'Peak_Hourly' || /peak.?hourly|hourly.?peak/i.test(n))
  if (!sheetName) {
    console.log('No Hourly / Peak hours sheet found; skipping hourly import.')
    return
  }
  const sheet = wb.Sheets[sheetName]
  const rows = XLSX.utils.sheet_to_json<(string | number)[]>(sheet, { header: 1 }) as (string | number)[][]
  const header = (rows[0] ?? []) as string[]
  const storeIdx = header.findIndex((c) => /store/i.test(String(c)))
  const hourIdx = header.findIndex((c) => /hour/i.test(String(c)))
  const dowIdx = header.findIndex((c) => /day|dow|dayofweek/i.test(String(c)))
  const avgIdx = header.findIndex((c) => /avg|count/i.test(String(c)))
  const dailyIdx = header.findIndex((c) => /daily|total/i.test(String(c)))
  const pctDayIdx = header.findIndex((c) => /pct|percent|%|day/i.test(String(c)))
  const maxIdx = header.findIndex((c) => /max/i.test(String(c)))
  const pctMaxIdx = header.findIndex((c) => /pct.*max|max.*pct/i.test(String(c)))

  if (storeIdx < 0 || hourIdx < 0 || dowIdx < 0) {
    console.log('Hourly sheet missing Store / Hour / Day columns; skipping.')
    return
  }

  let n = 0
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]
    if (!row) continue
    const storeId = parseStoreId(String(row[storeIdx] ?? ''))
    if (!storeId) continue
    let hour = Number(row[hourIdx])
    if (Number.isNaN(hour) && typeof row[hourIdx] === 'string') {
      const h = (row[hourIdx] as string).match(/(\d{1,2})/)
      hour = h ? parseInt(h[1], 10) : NaN
    }
    if (Number.isNaN(hour) || hour < 0 || hour > 23) continue
    let dayOfWeek = Number(row[dowIdx])
    if (Number.isNaN(dayOfWeek) && typeof row[dowIdx] === 'string') {
      const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
      const s = (row[dowIdx] as string).toLowerCase().slice(0, 3)
      dayOfWeek = days.indexOf(s) >= 0 ? days.indexOf(s) : NaN
    }
    if (Number.isNaN(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) continue

    const avgCount = avgIdx >= 0 && row[avgIdx] != null && row[avgIdx] !== '' ? Number(row[avgIdx]) : null
    const dailyTotal = dailyIdx >= 0 && row[dailyIdx] != null && row[dailyIdx] !== '' ? Number(row[dailyIdx]) : null
    const pctOfDay = pctDayIdx >= 0 && row[pctDayIdx] != null && row[pctDayIdx] !== '' ? Number(row[pctDayIdx]) : null
    const storeMax = maxIdx >= 0 && row[maxIdx] != null && row[maxIdx] !== '' ? Number(row[maxIdx]) : null
    const pctOfMax = pctMaxIdx >= 0 && row[pctMaxIdx] != null && row[pctMaxIdx] !== '' ? Number(row[pctMaxIdx]) : null

    await db.insert(hourlyTraffic).values({
      storeId,
      hour,
      dayOfWeek,
      avgCount: avgCount != null && !Number.isNaN(avgCount) ? String(avgCount) : null,
      dailyTotal: dailyTotal != null && !Number.isNaN(dailyTotal) ? String(dailyTotal) : null,
      pctOfDay: pctOfDay != null && !Number.isNaN(pctOfDay) ? String(pctOfDay) : null,
      storeMax: storeMax != null && !Number.isNaN(storeMax) ? String(storeMax) : null,
      pctOfMax: pctOfMax != null && !Number.isNaN(pctOfMax) ? String(pctOfMax) : null,
    })
    n++
  }
  console.log(`Hourly traffic / peak: imported ${n} rows.`)
}

async function main() {
  const path = process.argv[2]
  if (!path) {
    console.error('Usage: npx tsx scripts/import-retail-from-excel.ts <path-to-workbook.xlsx>')
    process.exit(1)
  }

  console.log('Reading', path, '...')
  const wb = XLSX.readFile(path)
  console.log('Sheets:', wb.SheetNames.join(', '))

  await importRetailData(wb)
  await importTrafficData(wb)
  await importHourlyData(wb)

  console.log('Done.')
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
