/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string
  readonly VITE_GOOGLE_CLIENT_ID?: string
  readonly VITE_SHARE_BASE_URL?: string
  /** Số điện thoại Zalo nhận liên hệ ở landing (bỏ trống = ẩn nút Zalo) */
  readonly VITE_CONTACT_ZALO?: string
  /** Gmail nhận liên hệ ở landing */
  readonly VITE_CONTACT_EMAIL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
