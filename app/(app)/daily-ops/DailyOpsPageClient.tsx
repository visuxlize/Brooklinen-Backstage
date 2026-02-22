'use client'

import { useState } from 'react'
import { Sunrise, Moon, DollarSign } from 'lucide-react'
import { DailyOpsProvider, useDailyOps, type DailyOpsUser } from '@/lib/daily-ops/DailyOpsContext'
import { WakeupPanel } from '@/components/daily-ops/WakeupPanel'
import { NightlyRecapPanel } from '@/components/daily-ops/NightlyRecapPanel'
import { SPACheckerPanel } from '@/components/daily-ops/SPACheckerPanel'

const TABS = [
  { id: 'wakeup', label: 'Morning Wakeup', icon: Sunrise },
  { id: 'recap', label: 'Nightly Recap', icon: Moon },
  { id: 'spa', label: 'SPA Checker', icon: DollarSign },
] as const

function DailyOpsTabs() {
  const [tab, setTab] = useState<(typeof TABS)[number]['id']>('wakeup')

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1 border-b border-slate-200 dark:border-slate-600 pb-2">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === id
                ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-200 border border-blue-200 dark:border-blue-800'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10 border border-transparent'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>
      {tab === 'wakeup' && <WakeupPanel />}
      {tab === 'recap' && <NightlyRecapPanel />}
      {tab === 'spa' && <SPACheckerPanel />}
    </div>
  )
}

interface DailyOpsPageClientProps {
  currentUser: DailyOpsUser
}

export function DailyOpsPageClient({ currentUser }: DailyOpsPageClientProps) {
  return (
    <DailyOpsProvider currentUser={currentUser}>
      <div className="p-4 sm:p-6">
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">Daily Ops</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
          Morning Wakeup, Nightly Recap, and SPA Checker share the same store and date. Change them in Morning Wakeup.
        </p>
        <DailyOpsTabs />
      </div>
    </DailyOpsProvider>
  )
}
