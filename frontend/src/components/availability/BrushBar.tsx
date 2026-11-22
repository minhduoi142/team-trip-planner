import { Check, CloudCheck, CloudUpload, Eraser, Loader2, TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Brush, SaveState } from '@/hooks/useAvailabilityEditor'
import { cn } from '@/lib/utils'

const BRUSHES: { value: Brush; label: string; swatch: string }[] = [
  { value: 'AVAILABLE', label: 'Rảnh', swatch: 'bg-emerald-400' },
  { value: 'MAYBE', label: 'Có thể', swatch: 'bg-amber-300' },
  { value: 'BUSY', label: 'Bận', swatch: 'bg-rose-300' },
]

const SAVE_LABEL: Record<SaveState, { text: string; icon: typeof Check; className: string }> = {
  idle: { text: 'Chạm hoặc kéo trên hàng của bạn', icon: Check, className: 'text-muted-foreground' },
  pending: { text: 'Chờ lưu…', icon: CloudUpload, className: 'text-muted-foreground' },
  saving: { text: 'Đang lưu…', icon: Loader2, className: 'text-muted-foreground [&_svg]:animate-spin' },
  saved: { text: 'Đã lưu', icon: CloudCheck, className: 'text-emerald-600 font-semibold' },
  error: { text: 'Lưu lỗi, thử lại', icon: TriangleAlert, className: 'text-destructive font-semibold' },
}

interface BrushBarProps {
  brush: Brush
  onBrushChange: (brush: Brush) => void
  onFillAll: () => void
  saveState: SaveState
}

/**
 * Thanh dock cọ vẽ dạng viên thuốc lơ lửng (Floating Pill Dock) ở đáy màn hình.
 * Chuyển động nhấp nhô nhẹ animate-float-slow, thao tác chạm lún phím 3D.
 */
export function BrushBar({ brush, onBrushChange, onFillAll, saveState }: BrushBarProps) {
  const save = SAVE_LABEL[saveState]
  const SaveIcon = save.icon

  return (
        <div className="sticky bottom-4 z-20 mx-auto max-w-lg rounded-full bg-card/95 p-2 shadow-clay-dock border border-border/70 backdrop-blur-md transition-all animate-float-slow">
          <div className="flex items-center gap-1.5 p-1 rounded-full bg-input/20 shadow-clay-sunken border border-border/60" role="radiogroup" aria-label="Chọn trạng thái để tô">
            {BRUSHES.map((b) => (
              <button
                key={b.value}
                type="button"
                role="radio"
                aria-checked={brush === b.value}
                onClick={() => onBrushChange(b.value)}
                className={cn(
                  'flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-2 text-xs sm:text-sm font-semibold transition-all duration-200',
                  brush === b.value
                    ? 'bg-primary text-primary-foreground shadow-clay-btn-primary scale-105 active:shadow-clay-pressed'
                    : 'bg-card text-foreground hover:bg-muted/70 shadow-clay-badge border border-border/50 active:scale-95',
                )}
              >
                <span className={cn('size-3 rounded-full shadow-xs', b.swatch)} />
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
                'flex items-center justify-center rounded-full px-3 py-2 text-xs sm:text-sm font-semibold transition-all duration-200',
                brush === 'CLEAR'
                  ? 'bg-primary text-primary-foreground shadow-clay-btn-primary scale-105 active:shadow-clay-pressed'
                  : 'bg-card text-muted-foreground hover:text-foreground hover:bg-muted/70 shadow-clay-badge border border-border/50 active:scale-95',
              )}
            >
              <Eraser className="size-4" />
              <span className="hidden sm:inline ml-1">Xóa</span>
            </button>
          </div>

              <div className="mt-2 flex items-center justify-between gap-2 px-3 text-xs">
                <p className={cn('flex items-center gap-1.5 truncate', save.className)}>
                  <SaveIcon className="size-3.5 shrink-0" />
                  <span className="truncate">{save.text}</span>
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  onClick={onFillAll}
                  className="shrink-0 rounded-full font-semibold shadow-clay-badge hover:scale-105 active:scale-95"
                >
                  Rảnh tất cả
                </Button>
              </div>
          </div>
          )
}
