import { CalendarClock } from 'lucide-react'
import { getCountdown, type CountdownInput, type CountdownTone } from '@/lib/date'
import { cn } from '@/lib/utils'

const TONE_STYLE: Record<CountdownTone, string> = {
  muted: 'bg-muted/70 text-muted-foreground border-border/50',
  upcoming: 'bg-rose-50 text-foreground border-rose-200/60',
  soon: 'bg-rose-100 text-rose-700 font-semibold border-rose-300/80 shadow-clay-badge',
  today: 'bg-rose-200 text-rose-800 font-bold border-rose-300 shadow-clay-btn-primary animate-pulse-gentle',
  ongoing: 'bg-emerald-100 text-emerald-800 font-bold border-emerald-300 shadow-clay-badge animate-pulse-gentle',
  done: 'bg-muted/60 text-muted-foreground border-border/50',
}

export function CountdownLabel({ trip, className }: { trip: CountdownInput; className?: string }) {
  const countdown = getCountdown(trip)
  return (
      <span
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium border shadow-xs transition-all select-none',
          TONE_STYLE[countdown.tone],
          className
        )}
      >
        <CalendarClock className="size-3.5 shrink-0" />
        {countdown.label}
      </span>
      )
}
