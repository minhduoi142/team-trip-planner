import { CalendarClock } from 'lucide-react'
import { getCountdown, type CountdownInput, type CountdownTone } from '@/lib/date'
import { cn } from '@/lib/utils'

const TONE_STYLE: Record<CountdownTone, string> = {
  muted: 'text-muted-foreground',
  upcoming: 'text-foreground',
  soon: 'text-rose-600',
  today: 'text-rose-600 font-semibold',
  ongoing: 'text-emerald-700 font-semibold',
  done: 'text-muted-foreground',
}

export function CountdownLabel({ trip, className }: { trip: CountdownInput; className?: string }) {
  const countdown = getCountdown(trip)
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-sm', TONE_STYLE[countdown.tone], className)}>
      <CalendarClock className="size-4 shrink-0" />
      {countdown.label}
    </span>
  )
}
