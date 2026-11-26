import { Badge } from '@/components/ui/badge'
import { STATUS_LABEL } from '@/lib/labels'
import { cn } from '@/lib/utils'
import type { TripStatus } from '@/types/trip'

const STATUS_STYLE: Record<TripStatus, string> = {
  PLANNING: 'bg-status-planning text-status-planning-foreground border-warning/25',
  UPCOMING: 'bg-status-upcoming text-status-upcoming-foreground border-info/25',
  ONGOING: 'bg-status-ongoing text-status-ongoing-foreground border-success/30',
  COMPLETED: 'bg-status-completed text-status-completed-foreground border-border',
}

export function StatusBadge({ status, className }: { status: TripStatus; className?: string }) {
  return (
    <Badge className={cn('border py-1 tracking-wide', STATUS_STYLE[status], className)}>
      {status === 'ONGOING' && <span aria-hidden="true" className="size-1.5 rounded-full bg-success" />}
      {STATUS_LABEL[status]}
    </Badge>
  )
}
