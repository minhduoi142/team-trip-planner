import { Check, CloudCheck, CloudUpload, Eraser, Loader2, TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import type { Brush, SaveState } from '@/hooks/useAvailabilityEditor'
import { cn } from '@/lib/utils'
import { STATUS_CELL } from './statusStyle'

const BRUSHES = ['AVAILABLE', 'MAYBE', 'BUSY'] as const

/** Nền khi đang chọn = màu trạng thái (viết tĩnh để Tailwind sinh class). */
const ON_CLASS: Record<(typeof BRUSHES)[number], string> = {
  AVAILABLE: 'data-[state=on]:bg-avail-yes data-[state=on]:text-avail-yes-foreground',
  MAYBE: 'data-[state=on]:bg-avail-maybe data-[state=on]:text-avail-maybe-foreground',
  BUSY: 'data-[state=on]:bg-avail-no data-[state=on]:text-avail-no-foreground',
}

const SAVE_LABEL: Record<SaveState, { text: string; icon: typeof Check; className: string }> = {
  idle: { text: 'Chạm hoặc kéo trên hàng của bạn', icon: Check, className: 'text-muted-foreground' },
  pending: { text: 'Chờ lưu…', icon: CloudUpload, className: 'text-muted-foreground' },
  saving: { text: 'Đang lưu…', icon: Loader2, className: 'text-muted-foreground [&_svg]:animate-spin' },
  saved: { text: 'Đã lưu', icon: CloudCheck, className: 'text-success-soft-foreground font-semibold' },
  error: { text: 'Lưu lỗi, thử lại', icon: TriangleAlert, className: 'text-destructive font-semibold' },
}

interface BrushBarProps {
  brush: Brush
  onBrushChange: (brush: Brush) => void
  onFillAll: () => void
  saveState: SaveState
}

/**
 * Thanh cọ dính đáy màn hình (không nhấp nhô, docs/ui-slop-audit.md P3-NR-05).
 * Viên cọ mang đúng màu ô tương ứng; cọ đang chọn có thêm viền đậm (không chỉ dựa vào màu).
 */
export function BrushBar({ brush, onBrushChange, onFillAll, saveState }: BrushBarProps) {
  const save = SAVE_LABEL[saveState]
  const SaveIcon = save.icon

  return (
    <div className="sticky bottom-4 z-20 mx-auto w-full max-w-lg rounded-surface border border-border bg-card p-2 shadow-overlay">
      <ToggleGroup
        type="single"
        aria-label="Chọn trạng thái để tô"
        value={brush}
        onValueChange={(next) => {
          if (next) onBrushChange(next as Brush)
        }}
        className="flex-nowrap gap-1.5"
      >
        {BRUSHES.map((value) => {
          const cell = STATUS_CELL[value]
          const Icon = cell.icon
          return (
            <ToggleGroupItem
              key={value}
              value={value}
              className={cn(
                'flex-1 px-2 sm:px-3.5',
                'data-[state=on]:ring-2 data-[state=on]:ring-foreground data-[state=on]:ring-offset-2 data-[state=on]:ring-offset-card',
                ON_CLASS[value],
              )}
            >
              <span
                className={cn('grid size-5 place-items-center rounded-md ring-1 ring-card', cell.className)}
                aria-hidden="true"
              >
                {Icon && <Icon className="size-3.5" strokeWidth={3} />}
              </span>
              {cell.label}
            </ToggleGroupItem>
          )
        })}
        <ToggleGroupItem
          value="CLEAR"
          aria-label="Xóa"
          title="Xóa"
          className="px-3 data-[state=on]:bg-muted data-[state=on]:text-foreground data-[state=on]:ring-2 data-[state=on]:ring-foreground data-[state=on]:ring-offset-2 data-[state=on]:ring-offset-card"
        >
          <Eraser />
          <span className="hidden sm:inline">Xóa</span>
        </ToggleGroupItem>
      </ToggleGroup>

      <div className="mt-2 flex items-center justify-between gap-2 px-2 text-xs">
        <p className={cn('flex min-w-0 items-center gap-1.5', save.className)} role="status">
          <SaveIcon className="size-3.5 shrink-0" />
          <span className="truncate">{save.text}</span>
        </p>
        <Button type="button" variant="outline" size="sm" onClick={onFillAll} className="shrink-0">
          Rảnh tất cả
        </Button>
      </div>
    </div>
  )
}
