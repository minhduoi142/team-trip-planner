import type { TripRole, TripStatus } from '@/types/trip'

export const ROLE_LABEL: Record<TripRole, string> = {
  OWNER: 'Trưởng nhóm',
  EDITOR: 'Thành viên',
  VIEWER: 'Người xem',
}

export const ROLE_DESCRIPTION: Record<TripRole, string> = {
  OWNER: 'Toàn quyền quản lý chuyến đi',
  EDITOR: 'Xem và chỉnh sửa nội dung chuyến đi',
  VIEWER: 'Chỉ xem, không chỉnh sửa',
}

export const STATUS_LABEL: Record<TripStatus, string> = {
  PLANNING: 'Đang chốt lịch',
  UPCOMING: 'Sắp khởi hành',
  ONGOING: 'Đang đi',
  COMPLETED: 'Đã hoàn thành',
}

const ROLE_RANK: Record<TripRole, number> = { VIEWER: 0, EDITOR: 1, OWNER: 2 }

/** Giống TripRole.atLeast ở backend. */
export function roleAtLeast(role: TripRole, required: TripRole): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[required]
}
