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
      className={cn('bg-white rounded-2xl shadow-sm border border-slate-100 p-5 flex flex-col gap-1', className)}
      style={accentColor ? { borderLeftColor: accentColor, borderLeftWidth: '4px' } : undefined}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">{label}</span>
        {icon && <span className="text-slate-400">{icon}</span>}
      </div>
      <div className="text-2xl font-bold text-slate-900 tracking-tight">{value}</div>
      {subValue && <div className="text-xs text-slate-500">{subValue}</div>}
    </div>
  )
}
