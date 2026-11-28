import { HeartPulse, Package, Shirt, Smartphone, Sparkles, Wallet, type LucideIcon } from 'lucide-react'
import { dressColor } from '@/lib/dressColors'
import type { DayOutfitsResponse } from '@/types/outfit'
import type { PackingCategory } from '@/types/packing'
import type { ChecklistCategory } from '@/types/checklist'
import type { DayWeatherResponse } from '@/types/weather'

/** Nhóm hành lý, đúng thứ tự PackingCategory ở backend. */
export const PACKING_CATEGORIES: { value: PackingCategory; label: string; icon: LucideIcon }[] = [
  { value: 'CLOTHES', label: 'Quần áo', icon: Shirt },
  { value: 'BEAUTY', label: 'Mỹ phẩm & vệ sinh', icon: Sparkles },
  { value: 'DOCUMENTS', label: 'Giấy tờ & tiền', icon: Wallet },
  { value: 'ELECTRONICS', label: 'Đồ điện tử', icon: Smartphone },
  { value: 'HEALTH', label: 'Sức khỏe', icon: HeartPulse },
  { value: 'OTHER', label: 'Khác', icon: Package },
]

/**
 * Khóa so trùng tên món, đồng bộ với PackingNames.key ở backend: bỏ dấu, đ → d, chữ thường, gộp khoảng trắng.
 * "Kem chống nắng" và "kem  chong nang" cho cùng khóa.
 */
export function packingKey(name: string): string {
  return name
    .normalize('NFD')
    .replace(/\p{M}+/gu, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
}

export interface PackingSuggestion {
  itemName: string
  category: PackingCategory
  /** Vì sao gợi ý, vd "mưa Ngày 2" */
  reason: string
  source: 'weather' | 'outfit'
}

/** Món checklist chung → nhóm hành lý (áo mưa, áo ấm là đồ mặc; kem chống nắng là mỹ phẩm). */
const FROM_CHECKLIST: Record<ChecklistCategory, PackingCategory> = {
  SHARED: 'OTHER',
  FOOD: 'OTHER',
  MEDICAL: 'BEAUTY',
  ELECTRONICS: 'ELECTRONICS',
  PHOTO: 'OTHER',
  OTHER: 'CLOTHES',
}

const ADVICE_REASON: Record<string, string> = {
  STORM: 'dông',
  RAIN: 'mưa',
  COLD: 'lạnh',
  HOT: 'nắng nóng',
  UV: 'UV cao',
  WIND: 'gió mạnh',
}

/**
 * Gợi ý (docs/sdd-packing-list.md 4.3): đồ theo dự báo thời tiết + outfit mình đã đăng. Bỏ món đã có trong danh
 * sách (so theo {@link packingKey}) và gợi ý trùng nhau. Không lưu gì.
 */
export function packingSuggestions(
  existingNames: string[],
  weatherDays: DayWeatherResponse[],
  outfitDays: DayOutfitsResponse[],
): PackingSuggestion[] {
  const seen = new Set(existingNames.map(packingKey))
  const result: PackingSuggestion[] = []
  const push = (s: PackingSuggestion) => {
    const key = packingKey(s.itemName)
    if (seen.has(key)) return
    seen.add(key)
    result.push(s)
  }

  for (const day of weatherDays) {
    for (const advice of day.forecast?.advice ?? []) {
      if (!advice.checklistItem) continue
      push({
        itemName: advice.checklistItem.itemName,
        category: FROM_CHECKLIST[advice.checklistItem.category],
        reason: `${ADVICE_REASON[advice.type] ?? 'thời tiết'} Ngày ${day.dayIndex}`,
        source: 'weather',
      })
    }
  }

  for (const day of outfitDays) {
    const mine = day.outfits.find((o) => o.mine)
    if (!mine) continue
    const colors = mine.colors.map((k) => dressColor(k)?.label).filter((l): l is string => Boolean(l))
    const what = mine.note?.trim() || colors.join(', ')
    if (!what) continue
    push({
      itemName: `Outfit Ngày ${day.dayIndex}: ${what}`.slice(0, 150),
      category: 'CLOTHES',
      reason: 'outfit đã đăng',
      source: 'outfit',
    })
  }
  return result
}
