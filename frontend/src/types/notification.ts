import type { IsoInstant } from './api'

/** Đồng bộ với backend: com.tripplanner.notification.dto.NotificationDtos */

export interface NotificationPrefsRequest {
  emailEnabled: boolean
  countdownEnabled: boolean
  memberEnabled: boolean
  expenseEnabled: boolean
}

export interface NotificationSettingsResponse {
  /** Email đã xác minh, null = chưa có */
  notifyEmail: string | null
  /** Email đang chờ xác minh (null nếu không có hoặc đã hết hạn) */
  pendingEmail: string | null
  pendingExpiresAt: IsoInstant | null
  /** Máy chủ đã cấu hình gửi mail chưa */
  mailConfigured: boolean
  emailEnabled: boolean
  countdownEnabled: boolean
  memberEnabled: boolean
  expenseEnabled: boolean
}

export interface NotifyEmailRequest {
  email: string
}

export interface VerifyEmailRequest {
  token: string
}

export interface VerifyEmailResponse {
  email: string
}

export interface UnsubscribeRequest {
  token: string
}

export type NotificationCategory = 'COUNTDOWN' | 'MEMBER' | 'EXPENSE'

/** Tắt/bật mọi email của 1 chuyến (kể cả đếm ngược) */
export interface TripMuteRequest {
  muted: boolean
}

export interface TripMuteResponse {
  muted: boolean
}

export interface UnsubscribeResponse {
  scope: 'ALL' | 'CATEGORY' | 'TRIP'
  /** Khi scope = CATEGORY, ngược lại null */
  category: NotificationCategory | null
  /** Khi scope = TRIP (null nếu chuyến đã bị xoá) */
  tripTitle: string | null
}
