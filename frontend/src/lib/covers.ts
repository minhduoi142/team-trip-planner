import { Flower2, Mountain, Palmtree, Sun, Trees, Waves, type LucideIcon } from 'lucide-react'

export interface CoverPreset {
  key: string
  label: string
  /** Tailwind gradient classes */
  gradient: string
  icon: LucideIcon
}

/** Ảnh bìa mặc định lưu dạng "preset:<key>" (backend chấp nhận cùng với URL http/https). */
export const COVER_PRESETS: CoverPreset[] = [
  { key: 'sunset', label: 'Hoàng hôn', gradient: 'from-rose-300 via-orange-200 to-amber-200', icon: Sun },
  { key: 'ocean', label: 'Biển xanh', gradient: 'from-sky-300 via-cyan-200 to-teal-200', icon: Waves },
  { key: 'lavender', label: 'Oải hương', gradient: 'from-violet-300 via-fuchsia-200 to-pink-200', icon: Flower2 },
  { key: 'tropical', label: 'Nhiệt đới', gradient: 'from-emerald-300 via-lime-200 to-yellow-200', icon: Palmtree },
  { key: 'mountain', label: 'Núi mây', gradient: 'from-indigo-300 via-sky-200 to-slate-100', icon: Mountain },
  { key: 'forest', label: 'Rừng thông', gradient: 'from-teal-400 via-emerald-200 to-green-100', icon: Trees },
]

const PRESET_PREFIX = 'preset:'

export function presetValue(key: string): string {
  return `${PRESET_PREFIX}${key}`
}

export type ResolvedCover = { kind: 'image'; url: string } | { kind: 'preset'; preset: CoverPreset }

/** Không có ảnh bìa → chọn gradient cố định theo seed (id chuyến đi) cho đẹp mắt. */
export function resolveCover(value: string | null | undefined, seed = 0): ResolvedCover {
  if (value?.startsWith(PRESET_PREFIX)) {
    const preset = COVER_PRESETS.find((p) => p.key === value.slice(PRESET_PREFIX.length))
    if (preset) return { kind: 'preset', preset }
  } else if (value) {
    return { kind: 'image', url: value }
  }
  return { kind: 'preset', preset: COVER_PRESETS[Math.abs(seed) % COVER_PRESETS.length] }
}
