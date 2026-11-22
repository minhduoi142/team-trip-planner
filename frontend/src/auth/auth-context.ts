import { createContext } from 'react'
import type { AuthResponse, UserResponse } from '@/types/auth'

export type AuthStatus = 'loading' | 'authenticated' | 'anonymous'

export interface AuthContextValue {
  status: AuthStatus
  user: UserResponse | null
  /** Lưu token + user sau khi đăng nhập/đăng ký thành công. */
  signIn: (auth: AuthResponse) => void
  signOut: () => void
  setUser: (user: UserResponse) => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)
