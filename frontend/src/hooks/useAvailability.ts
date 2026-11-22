import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { availabilityApi } from '@/api/availability'
import type { AvailabilityMatrixResponse, LockDateRequest, UpdateAvailabilityRequest } from '@/types/availability'
import { tripKeys, useTripCacheSync } from './useTrips'

export function useAvailability(tripId: number) {
  return useQuery({
    queryKey: tripKeys.availability(tripId),
    queryFn: () => availabilityApi.get(tripId),
  })
}

export function useTripDays(tripId: number, enabled: boolean) {
  return useQuery({
    queryKey: tripKeys.days(tripId),
    queryFn: () => availabilityApi.days(tripId),
    enabled,
  })
}

/** PUT trả lại cả ma trận → ghi thẳng vào cache, không gọi lại GET. */
export function useUpdateMyAvailability(tripId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: UpdateAvailabilityRequest) => availabilityApi.updateMine(tripId, body),
    onSuccess: (matrix: AvailabilityMatrixResponse) => qc.setQueryData(tripKeys.availability(tripId), matrix),
  })
}

export function useSetTripLength(tripId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (days: number) => availabilityApi.setTripLength(tripId, { days }),
    onSuccess: (matrix) => qc.setQueryData(tripKeys.availability(tripId), matrix),
  })
}

export function useLockDate(tripId: number) {
  const sync = useTripCacheSync()
  return useMutation({
    mutationFn: (body: LockDateRequest) => availabilityApi.lockDate(tripId, body),
    onSuccess: (trip) => sync.setDetail(trip),
  })
}

export function useUnlockDate(tripId: number) {
  const sync = useTripCacheSync()
  return useMutation({
    mutationFn: () => availabilityApi.unlockDate(tripId),
    onSuccess: (trip) => sync.setDetail(trip),
  })
}
