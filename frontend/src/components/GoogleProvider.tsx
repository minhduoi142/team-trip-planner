import { GoogleOAuthProvider } from '@react-oauth/google'
import type { ReactNode } from 'react'
import { GOOGLE_CLIENT_ID, googleLoginEnabled } from '@/lib/config'

/** Chỉ nạp Google Identity Services khi đã cấu hình VITE_GOOGLE_CLIENT_ID. */
export function GoogleProvider({ children }: { children: ReactNode }) {
  return googleLoginEnabled ? (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>{children}</GoogleOAuthProvider>
  ) : (
    children
  )
}
