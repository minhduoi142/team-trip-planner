import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'
import type { ErrorCode, ProblemDetail } from '@/types/api'
import { API_BASE_URL } from './config'
import { refreshErrorCode, refreshSession } from './session'
import { tokenStorage } from './token'

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  // Gửi/nhận cookie refresh token (HttpOnly) cả khi FE và BE khác cổng (dev: 5173 ↔ 8080)
  withCredentials: true,
})

/**
 * Phát ra khi phiên không cứu được (refresh thất bại) để AuthProvider đăng xuất.
 * `detail` = mã lỗi refresh (vd REFRESH_TOKEN_REUSED để báo người dùng).
 */
export const UNAUTHORIZED_EVENT = 'tp:unauthorized'

api.interceptors.request.use((config) => {
  const token = tokenStorage.get()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

type RetriableConfig = InternalAxiosRequestConfig & { _retriedAfterRefresh?: boolean }

/** Access token hết hạn (401) → refresh 1 lần (single-flight) rồi gửi lại request; không được thì đăng xuất. */
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ProblemDetail>) => {
    const config = error.config as RetriableConfig | undefined
    const isAuthCall = config?.url?.startsWith('/auth/') ?? false
    const hadToken = Boolean(config?.headers?.Authorization)
    if (error.response?.status === 401 && config && hadToken && !isAuthCall && !config._retriedAfterRefresh) {
      config._retriedAfterRefresh = true
      try {
        const auth = await refreshSession()
        config.headers.Authorization = `Bearer ${auth.accessToken}`
        return api(config)
      } catch (refreshError) {
        window.dispatchEvent(new CustomEvent(UNAUTHORIZED_EVENT, { detail: refreshErrorCode(refreshError) }))
      }
    }
    return Promise.reject(error)
  },
)

function problemOf(error: unknown): ProblemDetail | undefined {
  if (error instanceof AxiosError) {
    const data: unknown = error.response?.data
    if (data && typeof data === 'object' && 'code' in data) {
      return data as ProblemDetail
    }
  }
  return undefined
}

export function getErrorCode(error: unknown): ErrorCode | undefined {
  return problemOf(error)?.code
}

export function getErrorStatus(error: unknown): number | undefined {
  return error instanceof AxiosError ? error.response?.status : undefined
}

/** Thông báo tiếng Việt để hiển thị: ưu tiên `detail` từ backend. */
export function getErrorMessage(error: unknown): string {
  const problem = problemOf(error)
  if (problem?.detail) {
    return problem.detail
  }
  if (error instanceof AxiosError && !error.response) {
    return 'Không kết nối được máy chủ, kiểm tra mạng rồi thử lại'
  }
  return 'Có lỗi xảy ra, vui lòng thử lại'
}

export function getFieldErrors(error: unknown): Record<string, string> {
  return problemOf(error)?.fieldErrors ?? {}
}
