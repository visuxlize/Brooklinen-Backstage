'use client'

import { useState, useEffect } from 'react'
import { useDailyOps } from '@/lib/daily-ops/DailyOpsContext'
import { SHIFT_ROLES, SHIFT_ROLE_COLORS, type ShiftRole } from '@/lib/daily-ops/types'

const SLOT_COUNT = 9

/**
 * Nine employee slots: dropdown (store roster) + shift role dropdown.
 * Changes sync to SPA Checker and Nightly Recap via context.
 */
export function EmployeeSlots() {
  const { selectedStore, employees, setEmployeeSlot } = useDailyOps()
  const [roster, setRoster] = useState<string[]>([])

  useEffect(() => {
    if (!selectedStore) {
      setRoster([])
      return
    }
    fetch(`/api/employees?storeId=${encodeURIComponent(selectedStore)}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((arr: string[]) => setRoster(Array.isArray(arr) ? arr : []))
      .catch(() => setRoster([]))
  }, [selectedStore])

  return (
    <div className="space-y-2">
      {Array.from({ length: SLOT_COUNT }).map((_, i) => (
        <div key={i} className="flex flex-wrap items-center gap-2">
          <select
            value={employees[i]?.name ?? ''}
            onChange={(e) => setEmployeeSlot(i, { name: e.target.value || null })}
            className="flex-1 min-w-[140px] px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
          >
            <option value="">— Select employee —</option>
            {roster.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
          <select
            value={employees[i]?.role ?? ''}
            onChange={(e) => setEmployeeSlot(i, { role: (e.target.value || null) as ShiftRole | null })}
            className="min-w-[140px] px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
          >
            <option value="">— Role —</option>
            {SHIFT_ROLES.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
          {employees[i]?.role && (
            <span
              className="inline-block w-4 h-4 rounded-full flex-shrink-0 border border-slate-300 dark:border-slate-500"
              style={{ backgroundColor: SHIFT_ROLE_COLORS[employees[i].role as ShiftRole] ?? '#ccc' }}
              title={employees[i].role ?? ''}
            />
          )}
        </div>
      ))}
    </div>
  )
}
