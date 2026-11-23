import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import { authApi } from '@/api/auth'
import { UNAUTHORIZED_EVENT } from '@/lib/api'
import { queryClient } from '@/lib/queryClient'
import { refreshErrorCode, refreshSession, SESSION_EVENT } from '@/lib/session'
import { sessionHint, tokenStorage } from '@/lib/token'
import type { ErrorCode } from '@/types/api'
import type { AuthResponse, UserResponse } from '@/types/auth'
import { AuthContext, type AuthContextValue, type AuthStatus } from './auth-context'

/** Đồng bộ đăng nhập / đăng xuất giữa các tab cùng trình duyệt. */
type TabMessage = 'login' | 'logout'

const REUSED_MESSAGE = 'Phát hiện phiên đăng nhập bất thường. Để bảo vệ tài khoản, bạn cần đăng nhập lại.'
const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('tp-auth') : null

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<UserResponse | null>(null)
  // Có cờ phiên → thử refresh (cookie HttpOnly); không có → khách, khỏi gọi mạng
  const [status, setStatus] = useState<AuthStatus>(() => (sessionHint.get() ? 'loading' : 'anonymous'))
  const [loggedOut, setLoggedOut] = useState(false)

  /** Xóa phiên phía client (token hết hạn / tab khác đăng xuất). */
  const signOut = useCallback(() => {
    tokenStorage.clear()
    sessionHint.set(false)
    queryClient.clear()
    setUserState(null)
    setStatus('anonymous')
  }, [])

  const applySession = useCallback((auth: AuthResponse) => {
    setUserState(auth.user)
    setStatus('authenticated')
    setLoggedOut(false)
  }, [])

  const signIn = useCallback(
    (auth: AuthResponse) => {
      tokenStorage.set(auth.accessToken)
      sessionHint.set(true)
      queryClient.clear()
      applySession(auth)
      channel?.postMessage('login' satisfies TabMessage)
    },
    [applySession],
  )

  /** Bấm Đăng xuất: thu hồi họ refresh token ở server (best-effort), rồi về landing. */
  const logout = useCallback(() => {
    void authApi.logout().catch(() => undefined)
    signOut()
    setLoggedOut(true)
    channel?.postMessage('logout' satisfies TabMessage)
  }, [signOut])

  /** Đăng xuất mọi thiết bị: thu hồi mọi phiên của tài khoản ở server. */
  const logoutAll = useCallback(async () => {
    await authApi.logoutAll()
    signOut()
    setLoggedOut(true)
    channel?.postMessage('logout' satisfies TabMessage)
  }, [signOut])

  const setUser = useCallback((next: UserResponse) => setUserState(next), [])

  // Tải trang khi đang có phiên → lấy access token mới bằng refresh token
  useEffect(() => {
    if (status !== 'loading') return
    let cancelled = false
    refreshSession()
      .then((auth) => {
        if (!cancelled) applySession(auth)
      })
      .catch((error: unknown) => {
        if (cancelled) return
        if (refreshErrorCode(error) === 'REFRESH_TOKEN_REUSED') toast.error(REUSED_MESSAGE)
        signOut()
      })
    return () => {
      cancelled = true
    }
  }, [status, applySession, signOut])

  // Interceptor làm mới ngầm thành công → cập nhật user
  useEffect(() => {
    const onSession = (event: Event) => applySession((event as CustomEvent<AuthResponse>).detail)
    window.addEventListener(SESSION_EVENT, onSession)
    return () => window.removeEventListener(SESSION_EVENT, onSession)
  }, [applySession])

  // Phiên không cứu được → đăng xuất; bị phát hiện dùng lại token thì báo rõ cho người dùng
  useEffect(() => {
    const onUnauthorized = (event: Event) => {
      const code = (event as CustomEvent<ErrorCode | undefined>).detail
      if (code === 'REFRESH_TOKEN_REUSED') {
        toast.error(REUSED_MESSAGE)
      }
      signOut()
    }
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized)
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized)
  }, [signOut])

  // Tab khác đăng nhập → tab này refresh để dùng chung phiên; tab khác đăng xuất → tab này cũng thoát
  useEffect(() => {
    if (!channel) return
    const onMessage = (event: MessageEvent<TabMessage>) => {
      if (event.data === 'logout') {
        signOut()
        setLoggedOut(true)
      } else if (event.data === 'login') {
        setStatus((current) => (current === 'anonymous' ? 'loading' : current))
      }
    }
    channel.addEventListener('message', onMessage)
    return () => channel.removeEventListener('message', onMessage)
  }, [signOut])

  const value = useMemo<AuthContextValue>(
    () => ({ status, user, signIn, signOut, logout, logoutAll, loggedOut, setUser }),
    [status, user, signIn, signOut, logout, logoutAll, loggedOut, setUser],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
