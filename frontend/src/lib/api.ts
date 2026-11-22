import axios, { AxiosError } from 'axios'
import type { ErrorCode, ProblemDetail } from '@/types/api'
import { tokenStorage } from './token'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api/v1',
  headers: { 'Content-Type': 'application/json' },
})

/** Sự kiện phát ra khi token hết hạn / không hợp lệ để AuthProvider đăng xuất. */
export const UNAUTHORIZED_EVENT = 'tp:unauthorized'

api.interceptors.request.use((config) => {
  const token = tokenStorage.get()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ProblemDetail>) => {
    const hadToken = Boolean(error.config?.headers?.Authorization)
    if (error.response?.status === 401 && hadToken) {
      tokenStorage.clear()
      window.dispatchEvent(new Event(UNAUTHORIZED_EVENT))
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
