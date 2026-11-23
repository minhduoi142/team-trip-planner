import type { NotificationCategory } from '@/types/notification'

/**
 * Đọc phạm vi trong token huỷ nhận (phần payload không bí mật: "u1|{userId}|{scope}") để hiện trước khi người
 * dùng bấm xác nhận. Chỉ để hiển thị; backend mới là nơi kiểm tra chữ ký.
 */
export type UnsubscribeScope =
  | { kind: 'ALL' }
  | { kind: 'CATEGORY'; category: NotificationCategory }
  | { kind: 'TRIP' }

const CATEGORIES: NotificationCategory[] = ['COUNTDOWN', 'MEMBER', 'EXPENSE']

export function parseUnsubscribeScope(token: string): UnsubscribeScope | null {
  const payload = token.split('.')[0]
  if (!payload) return null
  try {
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/')
    const text = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '='))
    const [version, , scope] = text.split('|')
    if (version !== 'u1' || !scope) return null
    if (scope === 'ALL') return { kind: 'ALL' }
    if (scope.startsWith('TRIP:')) return { kind: 'TRIP' }
    const category = scope.startsWith('CAT:') ? (scope.slice(4) as NotificationCategory) : null
    return category && CATEGORIES.includes(category) ? { kind: 'CATEGORY', category } : null
  } catch {
    return null
  }
}

export const CATEGORY_LABELS: Record<NotificationCategory, string> = {
  COUNTDOWN: 'đếm ngược ngày đi',
  MEMBER: 'thành viên vào/rời nhóm',
  EXPENSE: 'chi tiêu và chuyển khoản',
}
