import { QueryClient } from '@tanstack/react-query'
import { getErrorStatus } from './api'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // App nhóm, không có realtime: thành viên khác thêm/sửa dữ liệu → tự làm mới, không cần F5.
      // Chỉ query đang hiển thị mới chạy (tab Radix bị ẩn thì unmount); tab trình duyệt ẩn thì dừng poll.
      staleTime: 5_000,
      refetchInterval: 15_000,
      refetchIntervalInBackground: false,
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
