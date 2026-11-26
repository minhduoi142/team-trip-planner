import { Plane } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Logo tĩnh: ô icon màu chủ đạo + chữ thường (không chữ gradient, không nhấp nhô; docs/ui-slop-audit.md P2-04). */
export function BrandLogo({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2 font-bold tracking-tight select-none', className)}>
      <span className="flex size-9 items-center justify-center rounded-item bg-primary-strong text-primary-strong-foreground shadow-flat">
        <Plane className="size-5 -rotate-12" aria-hidden="true" />
      </span>
      <span className="text-lg text-foreground">Trip Planner</span>
    </span>
  )
}
