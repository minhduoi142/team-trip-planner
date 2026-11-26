import { CalendarClock } from 'lucide-react'
import { getCountdown, type CountdownInput, type CountdownTone } from '@/lib/date'
import { cn } from '@/lib/utils'

const TONE_STYLE: Record<CountdownTone, string> = {
  muted: 'bg-muted/70 text-muted-foreground border-border/50',
  upcoming: 'bg-secondary text-secondary-foreground border-primary/15',
  soon: 'bg-primary/10 text-primary-strong font-semibold border-primary/30',
  today: 'bg-primary-strong text-primary-strong-foreground font-bold border-transparent',
  ongoing: 'bg-status-ongoing text-status-ongoing-foreground font-bold border-success/30',
  done: 'bg-muted/60 text-muted-foreground border-border/50',
}

export function CountdownLabel({ trip, className }: { trip: CountdownInput; className?: string }) {
  const countdown = getCountdown(trip)
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium select-none',
        TONE_STYLE[countdown.tone],
        className,
      )}
    >
      <CalendarClock className="size-3.5 shrink-0" />
      {countdown.label}
    </span>
  )
}
