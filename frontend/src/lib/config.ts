export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? ''

/** Chưa đặt VITE_GOOGLE_CLIENT_ID thì ẩn nút Google, vẫn đăng nhập bằng username/password được. */
export const googleLoginEnabled = GOOGLE_CLIENT_ID.length > 0

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api/v1'

/**
 * Gốc link chia sẻ có ảnh xem trước (trang /share/{code} do backend phục vụ).
 * API_BASE_URL có thể là đường dẫn tương đối (production: "/api/v1") → resolve theo origin hiện tại.
 */
export const SHARE_BASE_URL = (
  import.meta.env.VITE_SHARE_BASE_URL || new URL(API_BASE_URL, window.location.origin).origin
).replace(/\/$/, '')
