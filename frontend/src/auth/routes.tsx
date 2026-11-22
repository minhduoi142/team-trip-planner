import { Navigate, Outlet, useLocation, useSearchParams } from 'react-router'
import { FullPageSpinner } from '@/components/FullPageSpinner'
import { loginPath, safeReturnTo } from '@/lib/redirect'
import { useAuth } from './useAuth'

/** Trang cần đăng nhập: chưa đăng nhập thì chuyển về /login, giữ lại returnTo. */
export function ProtectedRoute() {
  const { status } = useAuth()
  const location = useLocation()

  if (status === 'loading') return <FullPageSpinner />
  if (status === 'anonymous') {
    return <Navigate to={loginPath(location.pathname + location.search)} replace />
  }
  return <Outlet />
}

/** Trang đăng nhập/đăng ký: đã đăng nhập thì đi thẳng tới returnTo. */
export function PublicOnlyRoute() {
  const { status } = useAuth()
  const [params] = useSearchParams()

  if (status === 'loading') return <FullPageSpinner />
  if (status === 'authenticated') {
    return <Navigate to={safeReturnTo(params.get('returnTo'))} replace />
  }
  return <Outlet />
}
