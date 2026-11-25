import { api } from '@/lib/api'
import type { GeoPlaceResponse, TripWeatherResponse } from '@/types/weather'

export const weatherApi = {
  /** Lỗi Open-Meteo không thành lỗi HTTP: các ngày có status UNAVAILABLE */
  trip: (tripId: number) => api.get<TripWeatherResponse>(`/trips/${tripId}/weather`).then((r) => r.data),
  /** 503 GEO_SEARCH_UNAVAILABLE khi Open-Meteo lỗi */
  searchPlaces: (q: string) => api.get<GeoPlaceResponse[]>('/geo/search', { params: { q } }).then((r) => r.data),
}
