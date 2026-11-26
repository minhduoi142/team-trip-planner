import { Check, CircleHelp, X, type LucideIcon } from 'lucide-react'
import type { AvailabilityStatus } from '@/types/availability'

/**
 * Màu + ký hiệu của từng trạng thái, lấy từ token `avail-*` trong index.css (mọi cặp chữ/nền ≥ 4,5:1).
 * "Bận" là slate trung tính, cố ý không trùng hue với primary (docs/ui-slop-audit.md P3-NR-03).
 */
export const STATUS_CELL: Record<
  AvailabilityStatus | 'NONE',
  { className: string; icon: LucideIcon | null; label: string }
> = {
  AVAILABLE: {
    className: 'bg-avail-yes text-avail-yes-foreground',
    icon: Check,
    label: 'Rảnh',
  },
  MAYBE: {
    className: 'bg-avail-maybe text-avail-maybe-foreground',
    icon: CircleHelp,
    label: 'Có thể',
  },
  BUSY: {
    className: 'bg-avail-no-soft text-avail-no-soft-foreground border border-avail-no/30',
    icon: X,
    label: 'Bận',
  },
  NONE: {
    className: 'border border-dashed border-border bg-card text-muted-foreground',
    icon: null,
    label: 'Chưa khai',
  },
}

export function cellStyle(status: AvailabilityStatus | null) {
  return STATUS_CELL[status ?? 'NONE']
}
