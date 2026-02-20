import { Check, X, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

interface RTOStatusBadgeProps {
  status: 'pending' | 'approved' | 'denied'
}

const config = {
  pending: {
    label: 'Pending',
    classes: 'bg-amber-50 text-amber-800 border border-amber-200',
    icon: Clock,
  },
  approved: {
    label: 'Approved',
    classes: 'bg-green-50 text-green-800 border border-green-200',
    icon: Check,
  },
  denied: {
    label: 'Denied',
    classes: 'bg-red-50 text-red-800 border border-red-200',
    icon: X,
  },
}

export function RTOStatusBadge({ status }: RTOStatusBadgeProps) {
  const { label, classes, icon: Icon } = config[status] ?? config.pending
  return (
    <span className={cn('inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold', classes)}>
      <Icon className="w-3 h-3" />
      {label}
    </span>
  )
}
