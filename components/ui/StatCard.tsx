import { cn } from '@/lib/utils'
import { ReactNode } from 'react'

interface StatCardProps {
  label: string
  value: string | number
  subValue?: string
  accentColor?: string
  icon?: ReactNode
  className?: string
}

export function StatCard({ label, value, subValue, accentColor, icon, className }: StatCardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border p-4 sm:p-5 flex flex-col gap-1.5',
        'bg-white dark:bg-slate-800/95 border-slate-200 dark:border-slate-600/80',
        'shadow-sm dark:shadow-none',
        'min-w-0',
        className
      )}
      style={accentColor ? { borderLeftColor: accentColor, borderLeftWidth: '4px' } : undefined}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400 truncate">
          {label}
        </span>
        {icon && <span className="text-slate-400 dark:text-slate-500 flex-shrink-0">{icon}</span>}
      </div>
      <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight tabular-nums">
        {value}
      </div>
      {subValue && (
        <div className="text-xs text-slate-500 dark:text-slate-400">{subValue}</div>
      )}
    </div>
  )
}
