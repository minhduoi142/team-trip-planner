import type { AvailabilityStatus } from '@/types/availability'

/** Màu + ký hiệu (cho người khó phân biệt màu) của từng trạng thái; null = chưa khai. */
export const STATUS_CELL: Record<AvailabilityStatus | 'NONE', { className: string; symbol: string; label: string }> = {
  AVAILABLE: { className: 'bg-emerald-400 text-white', symbol: '✓', label: 'Rảnh' },
  MAYBE: { className: 'bg-amber-300 text-amber-900', symbol: '?', label: 'Có thể' },
  BUSY: { className: 'bg-rose-200 text-rose-700', symbol: '✕', label: 'Bận' },
  NONE: { className: 'border border-dashed border-zinc-300 bg-white text-zinc-300', symbol: '', label: 'Chưa khai' },
}

export function cellStyle(status: AvailabilityStatus | null) {
  return STATUS_CELL[status ?? 'NONE']
}
