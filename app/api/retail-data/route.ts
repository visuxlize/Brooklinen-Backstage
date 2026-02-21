import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { retailData, stores } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'

/**
 * GET /api/retail-data?storeId=101&date=2025-03-15
 * Returns a single retail record for Daily Ops (Morning Wakeup / Nightly Recap).
 * Shape matches RetailDataRecord; DB currently has budgetNet/lyNet only; other fields null.
 */
export async function GET(request: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const storeId = parseInt(searchParams.get('storeId') ?? '', 10)
  const date = searchParams.get('date') ?? ''

  if (Number.isNaN(storeId) || !date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'Missing or invalid storeId / date' }, { status: 400 })
  }

  if (user.role !== 'ops' && user.storeId !== storeId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const [row] = await db
    .select({
      storeId: retailData.storeId,
      date: retailData.date,
      budgetNet: retailData.budgetNet,
      lyNet: retailData.lyNet,
      storeName: stores.name,
    })
    .from(retailData)
    .leftJoin(stores, eq(retailData.storeId, stores.id))
    .where(and(eq(retailData.storeId, storeId), eq(retailData.date, date)))
    .limit(1)

  if (!row) {
    return NextResponse.json({ error: 'No data for this date' }, { status: 404 })
  }

  const budgetNet = row.budgetNet != null ? Number(row.budgetNet) : null
  const lyNet = row.lyNet != null ? Number(row.lyNet) : null
  const storeLabel = `${row.storeId} ${row.storeName ?? ''}`.trim()

  return NextResponse.json({
    store: storeLabel,
    date: row.date,
    netRevBudget: budgetNet,
    netRevLY: lyNet,
    ordersBudget: null as number | null,
    ordersLY: null as number | null,
    aovBudget: null as number | null,
    aovLY: null as number | null,
    uptBudget: null as number | null,
    uptLY: null as number | null,
    cvrBudget: null as number | null,
    cvrLY: null as number | null,
    trafficBudget: null as number | null,
  })
}
