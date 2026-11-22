import { Badge } from '@/components/ui/badge'
import { STATUS_LABEL } from '@/lib/labels'
import { cn } from '@/lib/utils'
import type { TripStatus } from '@/types/trip'

const STATUS_STYLE: Record<TripStatus, string> = {
  PLANNING: 'bg-amber-100 text-amber-800',
  UPCOMING: 'bg-sky-100 text-sky-800',
  ONGOING: 'bg-emerald-100 text-emerald-800',
  COMPLETED: 'bg-zinc-100 text-zinc-600',
}

export function StatusBadge({ status, className }: { status: TripStatus; className?: string }) {
  return <Badge className={cn('border-transparent', STATUS_STYLE[status], className)}>{STATUS_LABEL[status]}</Badge>
}
