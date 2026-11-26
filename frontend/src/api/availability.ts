import { api } from '@/lib/api'
import type {
  AvailabilityMatrixResponse,
  LockDateRequest,
  TripDayResponse,
  TripLengthRequest,
  UpdateAvailabilityRequest,
} from '@/types/availability'
import type { TripDetailResponse } from '@/types/trip'

export const availabilityApi = {
  get: (tripId: number) => api.get<AvailabilityMatrixResponse>(`/trips/${tripId}/availabilities`).then((r) => r.data),
  updateMine: (tripId: number, body: UpdateAvailabilityRequest) =>
    api.put<AvailabilityMatrixResponse>(`/trips/${tripId}/availabilities`, body).then((r) => r.data),
  setTripLength: (tripId: number, body: TripLengthRequest) =>
    api.patch<AvailabilityMatrixResponse>(`/trips/${tripId}/trip-length`, body).then((r) => r.data),

  lockDate: (tripId: number, body: LockDateRequest) =>
    api.patch<TripDetailResponse>(`/trips/${tripId}/lock-date`, body).then((r) => r.data),
  unlockDate: (tripId: number) => api.delete<TripDetailResponse>(`/trips/${tripId}/lock-date`).then((r) => r.data),
  days: (tripId: number) => api.get<TripDayResponse[]>(`/trips/${tripId}/days`).then((r) => r.data),
}
