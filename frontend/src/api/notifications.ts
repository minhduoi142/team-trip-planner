import { api } from '@/lib/api'
import type {
  NotificationPrefsRequest,
  NotificationSettingsResponse,
  NotifyEmailRequest,
  TripMuteRequest,
  TripMuteResponse,
  UnsubscribeRequest,
  UnsubscribeResponse,
  VerifyEmailRequest,
  VerifyEmailResponse,
} from '@/types/notification'

export const notificationApi = {
  settings: () => api.get<NotificationSettingsResponse>('/users/me/notification-settings').then((r) => r.data),
  updatePrefs: (body: NotificationPrefsRequest) =>
    api.put<NotificationSettingsResponse>('/users/me/notification-settings', body).then((r) => r.data),
  /** Gửi link xác minh (email Google của chính mình thì xác minh ngay) */
  requestEmail: (body: NotifyEmailRequest) =>
    api.post<NotificationSettingsResponse>('/users/me/notify-email', body).then((r) => r.data),
  removeEmail: () => api.delete<NotificationSettingsResponse>('/users/me/notify-email').then((r) => r.data),
  sendTest: () => api.post<void>('/users/me/notify-email/test').then(() => undefined),
  /** Public: mở từ link trong email */
  verifyEmail: (body: VerifyEmailRequest) =>
    api.post<VerifyEmailResponse>('/notifications/verify-email', body).then((r) => r.data),
  tripMute: (tripId: number) =>
    api.get<TripMuteResponse>(`/trips/${tripId}/notification-mute`).then((r) => r.data),
  setTripMute: (tripId: number, body: TripMuteRequest) =>
    api.put<TripMuteResponse>(`/trips/${tripId}/notification-mute`, body).then((r) => r.data),
  /** Public: mở từ link trong email */
  unsubscribe: (body: UnsubscribeRequest) =>
    api.post<UnsubscribeResponse>('/notifications/unsubscribe', body).then((r) => r.data),
}
