import { AlertCircle, RotateCw, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { getErrorMessage } from '@/lib/api'
import { cn } from '@/lib/utils'

/**
 * Trạng thái rỗng dùng chung (docs/ui-slop-audit.md P1-43): icon lucide tĩnh thay cho emoji bay lơ lửng,
 * hành động đặt ngay trong khối.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon
  title: string
  description?: ReactNode
  action?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center gap-3 rounded-surface border border-dashed border-border bg-card px-6 py-10 text-center',
        className,
      )}
    >
      <span className="grid size-14 place-items-center rounded-full bg-primary/10 text-primary-strong">
        <Icon className="size-7" aria-hidden="true" />
      </span>
      <div className="grid gap-1">
        <p className="font-semibold">{title}</p>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {action && <div className="flex flex-wrap justify-center gap-2 pt-1">{action}</div>}
    </div>
  )
}

/** Lỗi tải dữ liệu của một tab (P1-44): màu destructive thay viền rose, có nút thử lại. */
export function TabErrorState({
  error,
  onRetry,
  title = 'Không tải được dữ liệu',
}: {
  error: unknown
  onRetry?: () => void
  title?: string
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-3 rounded-surface border border-destructive/30 bg-card px-6 py-8 text-center"
    >
      <AlertCircle className="size-8 text-destructive" aria-hidden="true" />
      <div className="grid gap-1">
        <p className="font-semibold">{title}</p>
        <p className="text-sm text-muted-foreground">{getErrorMessage(error)}</p>
      </div>
      {onRetry && (
        <Button variant="outline" onClick={onRetry}>
          <RotateCw />
          Thử lại
        </Button>
      )}
    </div>
  )
}

/** Skeleton có hình dạng gần bố cục thật (P1-44), tránh nhảy layout khi dữ liệu về. */
export function TabSkeleton({
  variant = 'list',
  rows = 3,
}: {
  variant?: 'list' | 'grid' | 'form+list'
  rows?: number
}) {
  if (variant === 'grid') {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3" aria-busy="true" aria-label="Đang tải">
        {Array.from({ length: rows * 2 }, (_, i) => (
          <Skeleton key={i} className="aspect-square rounded-item" />
        ))}
      </div>
    )
  }
  return (
    <div className="grid gap-3" aria-busy="true" aria-label="Đang tải">
      {variant === 'form+list' && <Skeleton className="h-10 rounded-control" />}
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-20 rounded-surface" />
      ))}
    </div>
  )
}
