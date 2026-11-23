import { createContext } from 'react'
import type { AuthResponse, UserResponse } from '@/types/auth'

export type AuthStatus = 'loading' | 'authenticated' | 'anonymous'

export interface AuthContextValue {
  status: AuthStatus
  user: UserResponse | null
  /** Lưu token + user sau khi đăng nhập/đăng ký thành công. */
  signIn: (auth: AuthResponse) => void
  /** Xóa phiên (vd token hết hạn): trang cần đăng nhập sẽ đưa về /login, giữ returnTo. */
  signOut: () => void
  /** Người dùng tự bấm Đăng xuất: trang cần đăng nhập sẽ đưa về landing (/). */
  logout: () => void
  /** Đăng xuất mọi thiết bị (thu hồi mọi phiên ở server), rồi về landing. */
  logoutAll: () => Promise<void>
  /** true sau khi tự đăng xuất (đến khi đăng nhập lại) */
  loggedOut: boolean
  setUser: (user: UserResponse) => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)
