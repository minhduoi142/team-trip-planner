import type { IsoDate, IsoInstant } from './api'
import type { ChecklistCategory } from './checklist'

/** com.tripplanner.weather.Condition */
export type WeatherCondition =
  | 'CLEAR'
  | 'PARTLY_CLOUDY'
  | 'CLOUDY'
  | 'FOG'
  | 'DRIZZLE'
  | 'RAIN'
  | 'HEAVY_RAIN'
  | 'SNOW'
  | 'THUNDERSTORM'
  | 'UNKNOWN'

/** com.tripplanner.weather.WeatherStatus */
export type WeatherStatus = 'FORECAST' | 'TOO_FAR' | 'PAST' | 'NO_DATE' | 'NO_LOCATION' | 'UNAVAILABLE'

/** com.tripplanner.weather.WeatherAdvice.Type */
export type AdviceType = 'STORM' | 'RAIN' | 'COLD' | 'HOT' | 'UV' | 'WIND'

/** com.tripplanner.weather.dto.AdviceResponse.ChecklistItemSuggestion */
export interface ChecklistItemSuggestion {
  itemName: string
  category: ChecklistCategory
}

/** com.tripplanner.weather.dto.AdviceResponse */
export interface AdviceResponse {
  type: AdviceType
  text: string
  /** Món nên thêm vào checklist chung; null nếu không có (nắng nóng, gió) */
  checklistItem: ChecklistItemSuggestion | null
}

/** com.tripplanner.weather.dto.ForecastResponse. Trường số null = chưa có dữ liệu (ẩn). °C, %, mm, km/h */
export interface ForecastResponse {
  weatherCode: number | null
  condition: WeatherCondition
  label: string
  tempMin: number | null
  tempMax: number | null
  precipProbability: number | null
  precipSum: number | null
  windMax: number | null
  uvMax: number | null
  /** Tối đa 2 gợi ý (áo mưa, áo ấm…); rỗng nếu thời tiết bình thường */
  advice: AdviceResponse[]
}

/** com.tripplanner.weather.dto.DayWeatherResponse */
export interface DayWeatherResponse {
  dayId: number
  dayIndex: number
  /** null khi chưa chốt / ngày thừa */
  date: IsoDate | null
  /** Tên vị trí hiệu lực; null nếu chưa có tọa độ */
  placeName: string | null
  status: WeatherStatus
  /** Chỉ có khi TOO_FAR */
  availableFrom: IsoDate | null
  /** Chỉ có khi FORECAST */
  forecast: ForecastResponse | null
}

/** com.tripplanner.weather.dto.TripWeatherResponse */
export interface TripWeatherResponse {
  /** Ghi nguồn bắt buộc (CC BY 4.0) */
  source: string
  /** null nếu không có ngày nào FORECAST */
  fetchedAt: IsoInstant | null
  days: DayWeatherResponse[]
}

/** com.tripplanner.weather.dto.GeoPlaceResponse */
export interface GeoPlaceResponse {
  name: string
  /** Xã/huyện/quận chứa địa điểm */
  area: string | null
  /** Tỉnh/bang */
  region: string | null
  country: string | null
  countryCode: string | null
  /** Loại địa điểm tiếng Việt: "Làng/bản", "Thác nước", "Đơn vị hành chính"… */
  kind: string | null
  lat: number
  lon: number
  /** "Tên, Tỉnh, Quốc gia": giá trị ô Điểm đến khi chọn */
  label: string
}
