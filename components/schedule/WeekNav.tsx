'use client'

import { ChevronLeft, ChevronRight, FileDown, Loader2, Check } from 'lucide-react'
import { format, addDays } from 'date-fns'

interface WeekNavProps {
  weekIdx: number
  totalWeeks: number
  weekStart: Date
  onPrev: () => void
  onNext: () => void
  canEmail: boolean
  emailState: 'idle' | 'loading' | 'sent'
  onEmail: () => void
}

export function WeekNav({
  weekIdx,
  totalWeeks,
  weekStart,
  onPrev,
  onNext,
  canEmail,
  emailState,
  onEmail,
}: WeekNavProps) {
  const weekEnd = addDays(weekStart, 6)
  const sameYear = weekStart.getFullYear() === weekEnd.getFullYear()
  const dateRange = sameYear
    ? `${format(weekStart, 'MMM d')} – ${format(weekEnd, 'MMM d')}, ${format(weekStart, 'yyyy')}`
    : `${format(weekStart, 'MMM d, yyyy')} – ${format(weekEnd, 'MMM d, yyyy')}`
  const showDots = totalWeeks <= 12

  return (
    <div className="flex items-center justify-between mb-5">
      <div className="flex items-center gap-3">
        <button
          onClick={onPrev}
          disabled={weekIdx === 0}
          className="p-2 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div className="text-center">
          <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            {dateRange}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Week {weekIdx + 1} of {totalWeeks} (Sun–Sat)
          </div>
        </div>

        <button
          onClick={onNext}
          disabled={weekIdx === totalWeeks - 1}
          className="p-2 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Dot indicators only when total weeks is small */}
      {showDots && (
        <div className="flex items-center gap-1.5">
          {Array.from({ length: totalWeeks }).map((_, i) => (
            <div
              key={i}
              className={`rounded-full transition-all ${
                i === weekIdx ? 'h-2 bg-blue-600 dark:bg-blue-500' : 'w-2 h-2 bg-slate-200 dark:bg-slate-600'
              }`}
              style={i === weekIdx ? { width: '20px' } : undefined}
            />
          ))}
        </div>
      )}
      {!showDots && <div className="w-4" />}

      {/* Save as PDF */}
      {canEmail && (
        <button
          onClick={onEmail}
          disabled={emailState === 'loading' || emailState === 'sent'}
          className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 disabled:opacity-50 text-sm font-medium transition-colors"
        >
          {emailState === 'loading' && <Loader2 className="w-4 h-4 animate-spin" />}
          {emailState === 'sent' && <Check className="w-4 h-4 text-green-600 dark:text-green-400" />}
          {emailState === 'idle' && <FileDown className="w-4 h-4" />}
          {emailState === 'sent' ? 'PDF saved' : 'Save as PDF'}
        </button>
      )}
    </div>
  )
}
