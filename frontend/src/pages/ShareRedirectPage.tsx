import { Navigate, useParams } from 'react-router'

/**
 * Link chia sẻ /share/{code} vốn do BACKEND phục vụ (HTML Open Graph cho Zalo/Messenger rồi chuyển tới /join).
 * Nếu reverse proxy chưa chuyển /share/ sang backend, request rơi vào SPA → chuyển thẳng tới trang tham gia
 * thay vì báo 404.
 */
export function ShareRedirectPage() {
  const { code = '' } = useParams()
  return <Navigate to={`/join/${encodeURIComponent(code.trim().toUpperCase())}`} replace />
}
