export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? ''

/** Chưa đặt VITE_GOOGLE_CLIENT_ID thì ẩn nút Google, vẫn đăng nhập bằng username/password được. */
export const googleLoginEnabled = GOOGLE_CLIENT_ID.length > 0

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api/v1'

/**
 * Gốc link chia sẻ có ảnh xem trước (trang /share/{code} do backend phục vụ).
 * API_BASE_URL có thể là đường dẫn tương đối (production: "/api/v1") → resolve theo origin hiện tại.
 */
export const SHARE_BASE_URL = (
  import.meta.env.VITE_SHARE_BASE_URL || new URL(API_BASE_URL, window.location.origin).origin
).replace(/\/$/, '')

/** Liên hệ ở landing: mở thẳng Zalo / Gmail, không qua backend. */
export const CONTACT_EMAIL = (import.meta.env.VITE_CONTACT_EMAIL ?? '').trim() || 'minhduoi142006@gmail.com'
const CONTACT_ZALO_PHONE = (import.meta.env.VITE_CONTACT_ZALO ?? '').replace(/\D/g, '')
/** null = chưa cấu hình VITE_CONTACT_ZALO → ẩn nút Zalo */
export const CONTACT_ZALO_URL = CONTACT_ZALO_PHONE ? `https://zalo.me/${CONTACT_ZALO_PHONE}` : null
/** Soạn thư mới trong Gmail (web/app), điền sẵn người nhận + tiêu đề */
export const CONTACT_GMAIL_URL = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(CONTACT_EMAIL)}&su=${encodeURIComponent('Góp ý Trip Planner')}`
