import { Badge } from '@/components/ui/badge'
import { STATUS_LABEL } from '@/lib/labels'
import { cn } from '@/lib/utils'
import type { TripStatus } from '@/types/trip'

const STATUS_STYLE: Record<TripStatus, string> = {
  PLANNING: 'bg-amber-100 text-amber-900 border-amber-200/80 shadow-clay-badge',
  UPCOMING: 'bg-sky-100 text-sky-900 border-sky-200/80 shadow-clay-badge',
  ONGOING: 'bg-emerald-100 text-emerald-900 border-emerald-200/80 shadow-clay-badge animate-pulse-gentle',
  COMPLETED: 'bg-zinc-100 text-zinc-700 border-zinc-200/80 shadow-clay-badge',
}

export function StatusBadge({ status, className }: { status: TripStatus; className?: string }) {
  return (
    <Badge
      className={cn(
        'rounded-full px-3 py-1 text-xs font-semibold tracking-wide border shadow-sm backdrop-blur-xs',
        STATUS_STYLE[status],
        className
      )}
    >
      {STATUS_LABEL[status]}
    </Badge>
  )
}
