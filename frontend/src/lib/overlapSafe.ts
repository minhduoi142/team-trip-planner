import type { QueryClient, QueryKey } from '@tanstack/react-query'

/**
 * Áp kết quả của một mutation "bật/tắt" (tích món…) mà không bị phản hồi đến sau ghi đè sai.
 * Bấm nhanh nhiều lần thì các request chạy chồng nhau và có thể trả về không theo thứ tự: chỉ lần cuối cùng còn
 * chạy mới cập nhật cache, và nếu đã có chồng nhau thì tải lại từ server thay vì tin một phản hồi có thể cũ.
 * Gọi trong onSuccess (TanStack v5 vẫn đếm mutation hiện tại là đang chạy lúc này).
 */
export function applyLatest<T>(
  qc: QueryClient,
  mutationKey: QueryKey,
  queryKey: QueryKey,
  data: T,
  overlapped: { current: boolean },
) {
  if (qc.isMutating({ mutationKey }) > 1) {
    overlapped.current = true
    return
  }
  if (overlapped.current) {
    overlapped.current = false
    void qc.invalidateQueries({ queryKey, exact: true })
    return
  }
  qc.setQueryData(queryKey, data)
}

/** onError của cùng loại mutation: chỉ khôi phục ảnh chụp cũ khi không có lần bấm nào chồng lên, nếu không thì tải lại. */
export function revertLatest<T>(
  qc: QueryClient,
  mutationKey: QueryKey,
  queryKey: QueryKey,
  previous: T | undefined,
  overlapped: { current: boolean },
) {
  if (qc.isMutating({ mutationKey }) > 1) {
    overlapped.current = true
    return
  }
  if (overlapped.current) {
    overlapped.current = false
    void qc.invalidateQueries({ queryKey, exact: true })
    return
  }
  if (previous !== undefined) qc.setQueryData(queryKey, previous)
}
