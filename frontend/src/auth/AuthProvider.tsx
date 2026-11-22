import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { authApi } from '@/api/auth'
import { UNAUTHORIZED_EVENT } from '@/lib/api'
import { queryClient } from '@/lib/queryClient'
import { tokenStorage } from '@/lib/token'
import type { AuthResponse, UserResponse } from '@/types/auth'
import { AuthContext, type AuthContextValue, type AuthStatus } from './auth-context'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<UserResponse | null>(null)
  const [status, setStatus] = useState<AuthStatus>(() => (tokenStorage.get() ? 'loading' : 'anonymous'))

  const signOut = useCallback(() => {
    tokenStorage.clear()
    queryClient.clear()
    setUserState(null)
    setStatus('anonymous')
  }, [])

  const signIn = useCallback((auth: AuthResponse) => {
    tokenStorage.set(auth.accessToken)
    queryClient.clear()
    setUserState(auth.user)
    setStatus('authenticated')
  }, [])

  const setUser = useCallback((next: UserResponse) => setUserState(next), [])

  // Có token sẵn trong máy → lấy lại thông tin user
  useEffect(() => {
    if (status !== 'loading') return
    let cancelled = false
    authApi
      .me()
      .then((me) => {
        if (cancelled) return
        setUserState(me)
        setStatus('authenticated')
      })
      .catch(() => {
        if (!cancelled) signOut()
      })
    return () => {
      cancelled = true
    }
  }, [status, signOut])

  // Token hết hạn giữa chừng → đăng xuất, ProtectedRoute sẽ đưa về trang đăng nhập
  useEffect(() => {
    window.addEventListener(UNAUTHORIZED_EVENT, signOut)
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, signOut)
  }, [signOut])

  const value = useMemo<AuthContextValue>(
    () => ({ status, user, signIn, signOut, setUser }),
    [status, user, signIn, signOut, setUser],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
