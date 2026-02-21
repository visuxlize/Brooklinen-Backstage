'use client'

import { useEffect } from 'react'
import type { RetailDataRecord } from './types'
import { useDailyOps } from './DailyOpsContext'

/**
 * When store + date are both set, fetches retail data and updates context.
 * Clears retailData when no match (404).
 */
export function useRetailDataLookup() {
  const { selectedStore, selectedDate, setRetailData } = useDailyOps()

  useEffect(() => {
    if (!selectedStore || !selectedDate) {
      setRetailData(null)
      return
    }
    const storeId = selectedStore
    const date = selectedDate
    let cancelled = false
    fetch(`/api/retail-data?storeId=${encodeURIComponent(storeId)}&date=${encodeURIComponent(date)}`)
      .then((res) => {
        if (cancelled) return null
        if (res.status === 404) return null
        if (!res.ok) throw new Error('Failed to fetch')
        return res.json() as Promise<RetailDataRecord>
      })
      .then((data) => {
        if (!cancelled && data) setRetailData(data)
        if (!cancelled && !data) setRetailData(null)
      })
      .catch(() => {
        if (!cancelled) setRetailData(null)
      })
    return () => {
      cancelled = true
    }
  }, [selectedStore, selectedDate, setRetailData])
}
