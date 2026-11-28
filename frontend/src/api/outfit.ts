import { api } from '@/lib/api'
import type { OutfitBoardResponse, OutfitRequest } from '@/types/outfit'

export const outfitApi = {
  board: (tripId: number) => api.get<OutfitBoardResponse>(`/trips/${tripId}/outfits`).then((r) => r.data),
  saveMine: (dayId: number, body: OutfitRequest) =>
    api.put<OutfitBoardResponse>(`/trip-days/${dayId}/outfits/me`, body).then((r) => r.data),
  deleteMine: (dayId: number) => api.delete<OutfitBoardResponse>(`/trip-days/${dayId}/outfits/me`).then((r) => r.data),
  deleteOf: (dayId: number, userId: number) =>
    api.delete<OutfitBoardResponse>(`/trip-days/${dayId}/outfits/${userId}`).then((r) => r.data),
}
