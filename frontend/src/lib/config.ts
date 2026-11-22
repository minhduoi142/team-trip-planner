export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? ''

/** Chưa đặt VITE_GOOGLE_CLIENT_ID thì ẩn nút Google, vẫn đăng nhập bằng username/password được. */
export const googleLoginEnabled = GOOGLE_CLIENT_ID.length > 0
