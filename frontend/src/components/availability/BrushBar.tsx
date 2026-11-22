import { Check, CloudCheck, CloudUpload, Eraser, Loader2, TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Brush, SaveState } from '@/hooks/useAvailabilityEditor'
import { cn } from '@/lib/utils'
import { STATUS_CELL } from './statusStyle'

const BRUSHES: { value: Brush; label: string; swatch: string }[] = [
  { value: 'AVAILABLE', label: 'Rảnh', swatch: STATUS_CELL.AVAILABLE.className },
  { value: 'MAYBE', label: 'Có thể', swatch: STATUS_CELL.MAYBE.className },
  { value: 'BUSY', label: 'Bận', swatch: STATUS_CELL.BUSY.className },
]

const SAVE_LABEL: Record<SaveState, { text: string; icon: typeof Check; className: string }> = {
  idle: { text: 'Chạm hoặc kéo trên hàng của bạn', icon: Check, className: 'text-muted-foreground' },
  pending: { text: 'Chờ lưu…', icon: CloudUpload, className: 'text-muted-foreground' },
  saving: { text: 'Đang lưu…', icon: Loader2, className: 'text-muted-foreground [&_svg]:animate-spin' },
  saved: { text: 'Đã lưu', icon: CloudCheck, className: 'text-emerald-600' },
  error: { text: 'Lưu lỗi, thử lại', icon: TriangleAlert, className: 'text-destructive' },
}

interface BrushBarProps {
  brush: Brush
  onBrushChange: (brush: Brush) => void
  onFillAll: () => void
  saveState: SaveState
}

/** Thanh chọn "cọ vẽ", dính đáy màn hình để thao tác một tay trên điện thoại. */
export function BrushBar({ brush, onBrushChange, onFillAll, saveState }: BrushBarProps) {
  const save = SAVE_LABEL[saveState]
  return (
    <div className="sticky bottom-3 z-20 rounded-3xl bg-card/95 p-3 shadow-lg ring-1 ring-border backdrop-blur">
      <div className="flex items-center gap-2" role="radiogroup" aria-label="Chọn trạng thái để tô">
        {BRUSHES.map((b) => (
          <button
            key={b.value}
            type="button"
            role="radio"
            aria-checked={brush === b.value}
            onClick={() => onBrushChange(b.value)}
            className={cn(
              'flex flex-1 items-center justify-center gap-1.5 rounded-2xl px-2 py-2 text-sm font-medium ring-1 ring-border transition',
              brush === b.value ? 'bg-foreground text-background ring-foreground' : 'bg-background',
            )}
          >
            <span className={cn('size-3.5 rounded-full', b.swatch)} />
            {b.label}
          </button>
        ))}
        <button
          type="button"
          role="radio"
          aria-checked={brush === 'CLEAR'}
          aria-label="Xóa"
          title="Xóa"
          onClick={() => onBrushChange('CLEAR')}
          className={cn(
            'flex items-center justify-center rounded-2xl px-3 py-2 ring-1 ring-border transition',
            brush === 'CLEAR' ? 'bg-foreground text-background ring-foreground' : 'bg-background',
          )}
        >
          <Eraser className="size-4" />
        </button>
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <span className={cn('flex items-center gap-1.5 text-xs', save.className)} aria-live="polite">
          <save.icon className="size-3.5" />
          {save.text}
        </span>
        <Button variant="ghost" size="sm" onClick={onFillAll}>
          Rảnh tất cả
        </Button>
      </div>
    </div>
  )
}
