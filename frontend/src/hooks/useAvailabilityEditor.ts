import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { getErrorMessage } from '@/lib/api'
import type { AvailabilityStatus } from '@/types/availability'
import { useUpdateMyAvailability } from './useAvailability'

export type Brush = AvailabilityStatus | 'CLEAR'
export type SaveState = 'idle' | 'pending' | 'saving' | 'saved' | 'error'

/** Thay đổi chưa được server xác nhận: ngày → trạng thái mới (null = xóa). */
type Pending = Map<string, AvailabilityStatus | null>

const DEBOUNCE_MS = 600

/**
 * Sửa lịch rảnh của chính mình: thay đổi hiển thị ngay (optimistic), gom lại và gửi PUT sau
 * {@link DEBOUNCE_MS} ms. Các lần gửi chạy TUẦN TỰ để response cũ không ghi đè dữ liệu mới.
 */
export function useAvailabilityEditor(tripId: number) {
  const { mutateAsync } = useUpdateMyAvailability(tripId)
  const [pending, setPendingState] = useState<Pending>(() => new Map())
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const pendingRef = useRef<Pending>(new Map())
  const inFlightRef = useRef(false)
  const timerRef = useRef<number | undefined>(undefined)

  const flushRef = useRef<() => Promise<void>>(() => Promise.resolve())

  const setPending = useCallback((next: Pending) => {
    pendingRef.current = next
    setPendingState(next)
  }, [])

  /** Hẹn giờ gửi; gọi qua ref để flush có thể tự hẹn lại lần sau. */
  const schedule = useCallback(() => {
    window.clearTimeout(timerRef.current)
    timerRef.current = window.setTimeout(() => void flushRef.current(), DEBOUNCE_MS)
  }, [])

  const flush = useCallback(async () => {
    window.clearTimeout(timerRef.current)
    if (inFlightRef.current || pendingRef.current.size === 0) return

    const sent = new Map(pendingRef.current)
    inFlightRef.current = true
    setSaveState('saving')
    try {
      await mutateAsync({ entries: [...sent].map(([date, status]) => ({ date, status })) })
      // Chỉ bỏ những ô chưa bị đổi tiếp trong lúc chờ response
      const next = new Map(pendingRef.current)
      sent.forEach((status, date) => {
        if (next.get(date) === status) next.delete(date)
      })
      setPending(next)
      setSaveState(next.size > 0 ? 'pending' : 'saved')
    } catch (error) {
      const next = new Map(pendingRef.current)
      sent.forEach((_, date) => next.delete(date))
      setPending(next)
      setSaveState('error')
      toast.error(getErrorMessage(error))
    } finally {
      inFlightRef.current = false
    }
    // Có thay đổi mới trong lúc đang gửi → gửi tiếp
    if (pendingRef.current.size > 0) {
      schedule()
    }
  }, [mutateAsync, setPending, schedule])

  useEffect(() => {
    flushRef.current = flush
  }, [flush])

  /** Áp cọ lên các ngày; {@code current} = trạng thái đang hiển thị để bỏ qua ô không đổi. */
  const paint = useCallback(
    (dates: string[], brush: Brush, current: (date: string) => AvailabilityStatus | null) => {
      const value = brush === 'CLEAR' ? null : brush
      const next = new Map(pendingRef.current)
      let changed = false
      for (const date of dates) {
        if (current(date) !== value) {
          next.set(date, value)
          changed = true
        }
      }
      if (!changed) return
      setPending(next)
      setSaveState('pending')
      schedule()
    },
    [schedule, setPending],
  )

  // Rời tab/trang khi còn thay đổi chưa gửi → gửi ngay
  useEffect(
    () => () => {
      window.clearTimeout(timerRef.current)
      void flushRef.current()
    },
    [],
  )

  return { pending, paint, saveState }
}
