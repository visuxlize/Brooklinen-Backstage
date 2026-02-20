'use client'

import { ChevronLeft, ChevronRight, Camera, Loader2, Check } from 'lucide-react'
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
  const dateRange = `${format(weekStart, 'MMM d')} – ${format(weekEnd, 'MMM d')}`

  return (
    <div className="flex items-center justify-between mb-5">
      <div className="flex items-center gap-3">
        <button
          onClick={onPrev}
          disabled={weekIdx === 0}
          className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div className="text-center">
          <div className="text-sm font-semibold text-slate-800">
            Week {weekIdx + 1} of {totalWeeks}
          </div>
          <div className="text-xs text-slate-500">{dateRange}</div>
        </div>

        <button
          onClick={onNext}
          disabled={weekIdx === totalWeeks - 1}
          className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Dot indicators */}
      <div className="flex items-center gap-1.5">
        {Array.from({ length: totalWeeks }).map((_, i) => (
          <div
            key={i}
            className={`rounded-full transition-all ${
              i === weekIdx ? 'h-2 bg-blue-600' : 'w-2 h-2 bg-slate-200'
            }`}
            style={i === weekIdx ? { width: '20px', backgroundColor: '#2563EB' } : undefined}
          />
        ))}
      </div>

      {/* Email button */}
      {canEmail && (
        <button
          onClick={onEmail}
          disabled={emailState === 'loading' || emailState === 'sent'}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-50 text-sm font-medium transition-colors"
        >
          {emailState === 'loading' && <Loader2 className="w-4 h-4 animate-spin" />}
          {emailState === 'sent' && <Check className="w-4 h-4 text-green-600" />}
          {emailState === 'idle' && <Camera className="w-4 h-4" />}
          {emailState === 'sent' ? 'Sent to all associates' : 'Email Schedule'}
        </button>
      )}
    </div>
  )
}
