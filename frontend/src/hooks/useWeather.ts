import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { weatherApi } from '@/api/weather'
import { tripKeys } from './useTrips'

const MINUTE = 60_000

/**
 * Thời tiết từng ngày của chuyến. Không poll 15 s như các query khác (dự báo đổi theo giờ, BE cache 2 h);
 * nằm dưới tripKeys.detail nên chốt/mở chốt ngày hay sửa điểm đến tự làm mới.
 */
export function useTripWeather(tripId: number, enabled: boolean) {
  return useQuery({
    queryKey: tripKeys.weather(tripId),
    queryFn: () => weatherApi.trip(tripId),
    enabled,
    refetchInterval: false,
    refetchOnWindowFocus: false,
    staleTime: 30 * MINUTE,
  })
}

const MIN_QUERY = 2
const DEBOUNCE_MS = 400

function useDebounced(value: string, delayMs: number): string {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs)
    return () => window.clearTimeout(timer)
  }, [value, delayMs])
  return debounced
}

/** Gợi ý địa điểm: chờ ngừng gõ 400 ms, từ 2 ký tự. Kết quả giữ 1 ngày (BE cũng cache 24 h). */
export function useGeoSearch(text: string, enabled: boolean) {
  const normalized = text.trim().replace(/\s+/g, ' ')
  const query = useDebounced(normalized, DEBOUNCE_MS)
  const active = enabled && query.length >= MIN_QUERY
  const result = useQuery({
    queryKey: ['geo', 'search', query.toLowerCase()],
    queryFn: () => weatherApi.searchPlaces(query),
    enabled: active,
    refetchInterval: false,
    refetchOnWindowFocus: false,
    staleTime: 24 * 60 * MINUTE,
    retry: false,
    placeholderData: keepPreviousData,
  })
  /** typing: người dùng vừa gõ, chưa hết thời gian chờ */
  return { ...result, active, typing: normalized !== query }
}
