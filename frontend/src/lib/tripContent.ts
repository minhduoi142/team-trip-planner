import {
  Bus,
  Camera,
  Coffee,
  Hotel,
  Landmark,
  Package,
  Pill,
  Plug,
  ShoppingBag,
  Sparkles,
  Ticket,
  Tent,
  UtensilsCrossed,
  type LucideIcon,
} from 'lucide-react'
import type { ChecklistCategory } from '@/types/checklist'
import type { ExpenseCategory } from '@/types/expense'
import type { ItineraryCategory } from '@/types/itinerary'

/**
 * `tone`: nền nhạt + chữ đậm cùng hue, lấy từ token `avatar-*` (chữ ≥ 5,3:1) và `muted` (docs/ui-slop-audit.md P3-CP-06/08).
 * Không dùng palette Tailwind viết cứng.
 */

export const ITINERARY_CATEGORIES: { value: ItineraryCategory; label: string; icon: LucideIcon; tone: string }[] = [
  { value: 'FOOD', label: 'Ăn uống', icon: UtensilsCrossed, tone: 'bg-avatar-7 text-avatar-7-foreground' },
  { value: 'SIGHTSEEING', label: 'Tham quan', icon: Landmark, tone: 'bg-avatar-4 text-avatar-4-foreground' },
  { value: 'ACTIVITY', label: 'Vui chơi', icon: Sparkles, tone: 'bg-avatar-2 text-avatar-2-foreground' },
  { value: 'TRANSPORT', label: 'Di chuyển', icon: Bus, tone: 'bg-muted text-muted-foreground' },
  { value: 'STAY', label: 'Lưu trú', icon: Hotel, tone: 'bg-avatar-3 text-avatar-3-foreground' },
  { value: 'SHOPPING', label: 'Mua sắm', icon: ShoppingBag, tone: 'bg-avatar-1 text-avatar-1-foreground' },
  { value: 'OTHER', label: 'Khác', icon: Coffee, tone: 'bg-avatar-6 text-avatar-6-foreground' },
]

export const CHECKLIST_CATEGORIES: { value: ChecklistCategory; label: string; icon: LucideIcon }[] = [
  { value: 'SHARED', label: 'Đồ dùng chung', icon: Tent },
  { value: 'FOOD', label: 'Ăn uống', icon: UtensilsCrossed },
  { value: 'MEDICAL', label: 'Y tế', icon: Pill },
  { value: 'ELECTRONICS', label: 'Điện tử', icon: Plug },
  { value: 'PHOTO', label: 'Chụp ảnh', icon: Camera },
  { value: 'OTHER', label: 'Khác', icon: Package },
]

export const EXPENSE_CATEGORIES: { value: ExpenseCategory; label: string; icon: LucideIcon; tone: string }[] = [
  { value: 'FOOD', label: 'Ăn uống', icon: UtensilsCrossed, tone: 'bg-avatar-7 text-avatar-7-foreground' },
  { value: 'TRANSPORT', label: 'Di chuyển', icon: Bus, tone: 'bg-avatar-4 text-avatar-4-foreground' },
  { value: 'STAY', label: 'Chỗ ở', icon: Hotel, tone: 'bg-avatar-3 text-avatar-3-foreground' },
  { value: 'TICKET', label: 'Vé / tour', icon: Ticket, tone: 'bg-avatar-5 text-avatar-5-foreground' },
  { value: 'SHOPPING', label: 'Mua sắm', icon: ShoppingBag, tone: 'bg-avatar-1 text-avatar-1-foreground' },
  { value: 'OTHER', label: 'Khác', icon: Package, tone: 'bg-muted text-muted-foreground' },
]

const EXPENSE_BY_VALUE = new Map(EXPENSE_CATEGORIES.map((c) => [c.value, c]))

export function expenseCategory(value: ExpenseCategory) {
  return EXPENSE_BY_VALUE.get(value) ?? EXPENSE_CATEGORIES[EXPENSE_CATEGORIES.length - 1]
}

const ITINERARY_BY_VALUE = new Map(ITINERARY_CATEGORIES.map((c) => [c.value, c]))
const CHECKLIST_BY_VALUE = new Map(CHECKLIST_CATEGORIES.map((c) => [c.value, c]))

export function itineraryCategory(value: ItineraryCategory) {
  return ITINERARY_BY_VALUE.get(value) ?? ITINERARY_CATEGORIES[ITINERARY_CATEGORIES.length - 1]
}

export function checklistCategory(value: ChecklistCategory) {
  return CHECKLIST_BY_VALUE.get(value) ?? CHECKLIST_CATEGORIES[CHECKLIST_CATEGORIES.length - 1]
}

const VND = new Intl.NumberFormat('vi-VN')

/** 1500000 → "1.500.000 ₫" */
export function formatVnd(amount: number): string {
  return `${VND.format(amount)} ₫`
}

/** Link mở Google Maps: ưu tiên link đã dán, không có thì tìm theo tên địa điểm. */
export function mapsHref(mapsUrl: string | null, locationName: string | null): string | null {
  if (mapsUrl) return mapsUrl
  if (!locationName) return null
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locationName)}`
}
