/** Bảng màu dress code. Key PHẢI khớp TripDayDressColor.PALETTE ở backend (cùng thứ tự). */
export const DRESS_COLORS: { key: string; label: string; hex: string }[] = [
  { key: 'white', label: 'Trắng', hex: '#ffffff' },
  { key: 'black', label: 'Đen', hex: '#1f1f1f' },
  { key: 'beige', label: 'Be', hex: '#e8d8c3' },
  { key: 'brown', label: 'Nâu', hex: '#8b5e3c' },
  { key: 'pastel-pink', label: 'Hồng pastel', hex: '#f9c6d3' },
  { key: 'hot-pink', label: 'Hồng đậm', hex: '#ec4899' },
  { key: 'red', label: 'Đỏ', hex: '#dc2626' },
  { key: 'orange', label: 'Cam', hex: '#fb923c' },
  { key: 'yellow', label: 'Vàng', hex: '#facc15' },
  { key: 'mint', label: 'Xanh mint', hex: '#a7f3d0' },
  { key: 'green', label: 'Xanh lá', hex: '#16a34a' },
  { key: 'sky', label: 'Xanh da trời', hex: '#7dd3fc' },
  { key: 'navy', label: 'Xanh navy', hex: '#1e3a8a' },
  { key: 'lavender', label: 'Tím lavender', hex: '#c4b5fd' },
  { key: 'purple', label: 'Tím', hex: '#7c3aed' },
  { key: 'denim', label: 'Denim', hex: '#4a6fa5' },
]

export const MAX_DRESS_COLORS = 4

const BY_KEY = new Map(DRESS_COLORS.map((c) => [c.key, c]))

export function dressColor(key: string) {
  return BY_KEY.get(key)
}

/** Màu nền sáng (độ sáng tương đối > 0,5): chữ/biểu tượng đặt lên nên dùng màu tối. */
export function isLightColor(hex: string): boolean {
  const n = Number.parseInt(hex.slice(1), 16)
  const channel = (v: number) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  const l = 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255)
  return l > 0.5
}
