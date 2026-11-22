import { QueryClient } from '@tanstack/react-query'
import { getErrorStatus } from './api'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: true,
      // Không thử lại với lỗi 4xx (không có quyền, không tồn tại...)
      retry: (failureCount, error) => {
        const status = getErrorStatus(error)
        if (status && status >= 400 && status < 500) return false
        return failureCount < 2
      },
    },
  },
})
