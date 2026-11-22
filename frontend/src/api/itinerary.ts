import { api } from '@/lib/api'
import type { ItineraryItemRequest, ItineraryResponse, UpdateDayRequest } from '@/types/itinerary'

/** Mọi thao tác ghi đều trả lại toàn bộ lịch trình. */
export const itineraryApi = {
  get: (tripId: number) => api.get<ItineraryResponse>(`/trips/${tripId}/itinerary`).then((r) => r.data),
  addItem: (dayId: number, body: ItineraryItemRequest) =>
    api.post<ItineraryResponse>(`/trip-days/${dayId}/items`, body).then((r) => r.data),
  updateItem: (itemId: number, body: ItineraryItemRequest) =>
    api.put<ItineraryResponse>(`/itinerary-items/${itemId}`, body).then((r) => r.data),
  deleteItem: (itemId: number) => api.delete<ItineraryResponse>(`/itinerary-items/${itemId}`).then((r) => r.data),
  reorder: (dayId: number, itemIds: number[]) =>
    api.put<ItineraryResponse>(`/trip-days/${dayId}/items/order`, { itemIds }).then((r) => r.data),
  move: (itemId: number, dayId: number) =>
    api.post<ItineraryResponse>(`/itinerary-items/${itemId}/move`, { dayId }).then((r) => r.data),
  updateDay: (dayId: number, body: UpdateDayRequest) =>
    api.put<ItineraryResponse>(`/trip-days/${dayId}`, body).then((r) => r.data),
  deleteOverflowDay: (dayId: number) => api.delete<ItineraryResponse>(`/trip-days/${dayId}`).then((r) => r.data),
}
