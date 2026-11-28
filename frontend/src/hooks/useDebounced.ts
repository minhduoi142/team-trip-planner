import { useEffect, useState } from 'react'

/** Giá trị chỉ đổi sau khi `value` đứng yên `delayMs` (dùng cho ô gõ gọi API). */
export function useDebounced<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs)
    return () => window.clearTimeout(timer)
  }, [value, delayMs])
  return debounced
}
