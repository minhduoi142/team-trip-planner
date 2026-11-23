/**
 * Access token chỉ sống trong BỘ NHỚ của tab (không ghi localStorage): XSS không lấy được token lâu dài.
 * Tải lại trang → mất token → AuthProvider gọi /auth/refresh (cookie HttpOnly) để lấy lại.
 * Xem docs/sdd-refresh-token.md.
 */
let accessToken: string | null = null

/** Key cũ (trước khi có refresh token): xóa một lần để token 7 ngày không còn nằm trong máy. */
const LEGACY_TOKEN_KEY = 'tp.accessToken'
/** Cờ KHÔNG bí mật: "có thể đang có cookie refresh" → khách chưa đăng nhập khỏi phải gọi refresh. */
const SESSION_HINT_KEY = 'tp.hasSession'

try {
  localStorage.removeItem(LEGACY_TOKEN_KEY)
} catch {
  /* localStorage bị chặn (chế độ riêng tư): bỏ qua */
}

export const tokenStorage = {
  get(): string | null {
    return accessToken
  },
  set(token: string): void {
    accessToken = token
  },
  clear(): void {
    accessToken = null
  },
}

export const sessionHint = {
  get(): boolean {
    try {
      return localStorage.getItem(SESSION_HINT_KEY) === '1'
    } catch {
      return true // không đọc được thì cứ thử refresh
    }
  },
  set(on: boolean): void {
    try {
      if (on) localStorage.setItem(SESSION_HINT_KEY, '1')
      else localStorage.removeItem(SESSION_HINT_KEY)
    } catch {
      /* bỏ qua */
    }
  },
}
