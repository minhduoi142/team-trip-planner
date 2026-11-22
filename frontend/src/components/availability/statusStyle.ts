import type { AvailabilityStatus } from '@/types/availability'

/** Màu + ký hiệu của từng trạng thái dạng viên sỏi đất sét 3D (3D Clay Pebble) */
export const STATUS_CELL: Record<AvailabilityStatus | 'NONE', { className: string; symbol: string; label: string }> = {
  AVAILABLE: {
    className: 'bg-emerald-400 text-white shadow-clay-badge border border-emerald-300/80',
    symbol: '✓',
    label: 'Rảnh',
  },
  MAYBE: {
    className: 'bg-amber-300 text-amber-950 shadow-clay-badge border border-amber-200/80',
    symbol: '?',
    label: 'Có thể',
  },
  BUSY: {
    className: 'bg-rose-200 text-rose-800 shadow-clay-badge border border-rose-300/80',
    symbol: '✕',
    label: 'Bận',
  },
  NONE: {
    className: 'border-2 border-dashed border-border/80 bg-input/10 text-muted-foreground/35 shadow-clay-sunken',
    symbol: '',
    label: 'Chưa khai',
  },
}

export function cellStyle(status: AvailabilityStatus | null) {
  return STATUS_CELL[status ?? 'NONE']
}
