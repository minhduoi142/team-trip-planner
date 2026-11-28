import { dressColor } from '@/lib/dressColors'
import type { OutfitResponse } from '@/types/outfit'

export const MAX_OUTFIT_PHOTOS = 4
export const MAX_OUTFIT_COLORS = 3

/** Màu có ít nhất 2 người cùng chọn, theo thứ tự bảng màu của người chọn đầu tiên. */
export function sharedColors(outfits: OutfitResponse[]): { key: string; label: string; names: string[] }[] {
  const byColor = new Map<string, string[]>()
  for (const outfit of outfits) {
    const name = outfit.mine ? 'Bạn' : outfit.displayName
    for (const key of outfit.colors) {
      byColor.set(key, [...(byColor.get(key) ?? []), name])
    }
  }
  return [...byColor.entries()]
    .filter(([, names]) => names.length >= 2)
    .map(([key, names]) => ({ key, label: dressColor(key)?.label ?? key, names }))
}

/** Câu thông tin (không phải cảnh báo, nhóm có thể cố ý mặc đồng phục): "Bạn, Mai cùng chọn Trắng". */
export function sharedColorsText(outfits: OutfitResponse[]): string | null {
  const shared = sharedColors(outfits)
  if (shared.length === 0) return null
  return shared.map((s) => `${s.names.join(', ')} cùng chọn ${s.label}`).join(' · ')
}

/** Outfit có ít nhất 1 màu trùng màu dress code của ngày. */
export function matchesDressCode(outfit: OutfitResponse, dressColors: string[]): boolean {
  return dressColors.length > 0 && outfit.colors.some((c) => dressColors.includes(c))
}
