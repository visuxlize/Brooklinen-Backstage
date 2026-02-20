import { cn } from '@/lib/utils'

interface ChipProps {
  label: string
  variant?: 'default' | 'blue' | 'green' | 'red' | 'amber' | 'violet' | 'slate'
  size?: 'sm' | 'md'
  className?: string
}

const variantClasses: Record<NonNullable<ChipProps['variant']>, string> = {
  default: 'bg-slate-100 text-slate-700',
  blue: 'bg-blue-50 text-blue-800 border border-blue-200',
  green: 'bg-green-50 text-green-800 border border-green-200',
  red: 'bg-red-50 text-red-800 border border-red-200',
  amber: 'bg-amber-50 text-amber-800 border border-amber-200',
  violet: 'bg-violet-50 text-violet-800 border border-violet-200',
  slate: 'bg-slate-50 text-slate-600 border border-slate-200',
}

const sizeClasses = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-xs',
}

export function Chip({ label, variant = 'default', size = 'md', className }: ChipProps) {
  return (
    <span
      className={cn(
        'rounded-full font-semibold inline-flex items-center gap-1',
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
    >
      {label}
    </span>
  )
}
