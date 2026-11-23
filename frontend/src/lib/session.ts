import axios, { AxiosError } from 'axios'
import type { ErrorCode, ProblemDetail } from '@/types/api'
import type { AuthResponse } from '@/types/auth'
import { API_BASE_URL } from './config'
import { sessionHint, tokenStorage } from './token'

/**
 * Làm mới phiên bằng refresh token trong cookie HttpOnly (docs/sdd-refresh-token.md).
 * - Single-flight trong tab: nhiều request 401 cùng lúc chỉ gây 1 lần refresh.
 * - Giữa các tab: Web Locks → các tab lần lượt refresh, tab sau gửi cookie MỚI mà tab trước vừa nhận.
 * - REFRESH_TOKEN_STALE (tab khác vừa xoay): đợi chút rồi thử lại 1 lần với cookie mới.
 */

/** Phát ra sau mỗi lần refresh thành công (AuthProvider cập nhật user). */
export const SESSION_EVENT = 'tp:session'

// Client riêng, không qua interceptor của `api` (tránh vòng lặp 401 → refresh → 401)
const refreshClient = axios.create({ baseURL: API_BASE_URL, withCredentials: true })

let inFlight: Promise<AuthResponse> | null = null

export function refreshErrorCode(error: unknown): ErrorCode | undefined {
  if (error instanceof AxiosError) {
    const data = error.response?.data as ProblemDetail | undefined
    return data && typeof data === 'object' && 'code' in data ? data.code : undefined
  }
  return undefined
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

async function callRefresh(): Promise<AuthResponse> {
  try {
    return (await refreshClient.post<AuthResponse>('/auth/refresh')).data
  } catch (error) {
    if (refreshErrorCode(error) === 'REFRESH_TOKEN_STALE') {
      await sleep(300)
      return (await refreshClient.post<AuthResponse>('/auth/refresh')).data
    }
    throw error
  }
}

function withCrossTabLock<T>(task: () => Promise<T>): Promise<T> {
  const locks = typeof navigator !== 'undefined' ? navigator.locks : undefined
  return locks?.request ? locks.request('tp-refresh-token', task) : task()
}

export function refreshSession(): Promise<AuthResponse> {
  if (!inFlight) {
    inFlight = withCrossTabLock(callRefresh)
      .then((auth) => {
        tokenStorage.set(auth.accessToken)
        sessionHint.set(true)
        window.dispatchEvent(new CustomEvent<AuthResponse>(SESSION_EVENT, { detail: auth }))
        return auth
      })
      .catch((error: unknown) => {
        tokenStorage.clear()
        // Server khẳng định phiên đã hết → bỏ cờ (lỗi mạng thì giữ để lần sau thử lại)
        if (refreshErrorCode(error)) sessionHint.set(false)
        throw error
      })
      .finally(() => {
        inFlight = null
      })
  }
  return inFlight
}
