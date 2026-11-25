import type { IsoDate } from './api'

/** com.tripplanner.itinerary.ItineraryCategory */
export type ItineraryCategory = 'FOOD' | 'SIGHTSEEING' | 'TRANSPORT' | 'STAY' | 'SHOPPING' | 'ACTIVITY' | 'OTHER'

/** "HH:mm" */
export type TimeOfDay = string

/** com.tripplanner.itinerary.dto.ItineraryItemResponse */
export interface ItineraryItemResponse {
  id: number
  dayId: number
  title: string
  category: ItineraryCategory
  startTime: TimeOfDay | null
  endTime: TimeOfDay | null
  locationName: string | null
  mapsUrl: string | null
  note: string | null
  /** VND */
  estimatedCost: number | null
  sortOrder: number
  createdByName: string | null
}

/** com.tripplanner.itinerary.dto.DressCodeResponse */
export interface DressCodeResponse {
  theme: string | null
  note: string | null
  imageUrl: string | null
  /** key trong bảng màu (lib/dressColors.ts) */
  colors: string[]
}

/** com.tripplanner.itinerary.dto.DayPlaceResponse */
export interface DayPlaceResponse {
  name: string
  lat: number
  lon: number
}

/** com.tripplanner.itinerary.dto.ItineraryDayResponse */
export interface ItineraryDayResponse {
  id: number
  dayIndex: number
  /** null khi chưa chốt hoặc là ngày thừa */
  date: IsoDate | null
  overflow: boolean
  note: string | null
  /** Vị trí riêng của ngày; null = theo vị trí của chuyến */
  place: DayPlaceResponse | null
  dress: DressCodeResponse
  totalCost: number
  timeOrderBroken: boolean
  items: ItineraryItemResponse[]
}

/** com.tripplanner.itinerary.dto.ItineraryResponse */
export interface ItineraryResponse {
  locked: boolean
  startDate: IsoDate | null
  endDate: IsoDate | null
  /** số ngày đã chốt; null nếu chưa chốt */
  tripDays: number | null
  totalCost: number
  days: ItineraryDayResponse[]
}

/** com.tripplanner.itinerary.dto.ItineraryItemRequest */
export interface ItineraryItemRequest {
  title: string
  category: ItineraryCategory
  startTime: TimeOfDay | null
  endTime: TimeOfDay | null
  locationName: string | null
  mapsUrl: string | null
  note: string | null
  estimatedCost: number | null
}

/** com.tripplanner.itinerary.dto.ReorderItemsRequest */
export interface ReorderItemsRequest {
  itemIds: number[]
}

/** com.tripplanner.itinerary.dto.MoveItemRequest */
export interface MoveItemRequest {
  dayId: number
}

/** com.tripplanner.itinerary.dto.UpdateDayRequest */
export interface UpdateDayRequest {
  note: string | null
  dressTheme: string | null
  dressNote: string | null
  dressImageUrl: string | null
  dressColors: string[]
  /** Vị trí riêng của ngày (chọn từ gợi ý): cả ba hoặc không; null = theo vị trí của chuyến */
  placeName: string | null
  placeLat: number | null
  placeLon: number | null
}
