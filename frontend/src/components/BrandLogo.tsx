import { Plane } from 'lucide-react'
import { cn } from '@/lib/utils'

export function BrandLogo({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2 font-bold tracking-tight', className)}>
      <span className="flex size-9 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-400 to-fuchsia-400 text-white shadow-sm">
        <Plane className="size-5 -rotate-12" />
      </span>
      <span className="bg-gradient-to-r from-rose-500 to-fuchsia-500 bg-clip-text text-lg text-transparent">
        Trip Planner
      </span>
    </span>
  )
}
