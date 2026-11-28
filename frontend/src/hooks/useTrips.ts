import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { tripsApi } from '@/api/trips'
import type { TripDetailResponse, TripRequest, TripRole } from '@/types/trip'

export const tripKeys = {
  all: ['trips'] as const,
  list: () => [...tripKeys.all, 'list'] as const,
  detail: (tripId: number) => [...tripKeys.all, 'detail', tripId] as const,
  /** Nằm dưới detail: invalidate detail là lịch rảnh / ngày đi cũng được làm mới */
  availability: (tripId: number) => [...tripKeys.detail(tripId), 'availability'] as const,
  days: (tripId: number) => [...tripKeys.detail(tripId), 'days'] as const,
  itinerary: (tripId: number) => [...tripKeys.detail(tripId), 'itinerary'] as const,
  checklist: (tripId: number) => [...tripKeys.detail(tripId), 'checklist'] as const,
  polls: (tripId: number) => [...tripKeys.detail(tripId), 'polls'] as const,
  expenses: (tripId: number) => [...tripKeys.detail(tripId), 'expenses'] as const,
  album: (tripId: number) => [...tripKeys.detail(tripId), 'album'] as const,
  rooms: (tripId: number) => [...tripKeys.detail(tripId), 'rooms'] as const,
  /** Thời tiết: dưới detail nên chốt/mở chốt ngày hay sửa điểm đến tự làm mới */
  weather: (tripId: number) => [...tripKeys.detail(tripId), 'weather'] as const,
  proposals: (tripId: number) => [...tripKeys.detail(tripId), 'proposals'] as const,
  outfits: (tripId: number) => [...tripKeys.detail(tripId), 'outfits'] as const,
  /** Hành lý cá nhân của chính mình */
  packing: (tripId: number) => [...tripKeys.detail(tripId), 'packing'] as const,
  /** Ví giấy tờ (giấy tờ chung + giấy tờ riêng của mình) */
  documents: (tripId: number) => [...tripKeys.detail(tripId), 'documents'] as const,
  invite: (code: string) => ['invite', code.toUpperCase()] as const,
}

export function useTrips() {
  return useQuery({ queryKey: tripKeys.list(), queryFn: tripsApi.list })
}

export function useTrip(tripId: number) {
  return useQuery({
    queryKey: tripKeys.detail(tripId),
    queryFn: () => tripsApi.get(tripId),
    enabled: Number.isFinite(tripId),
  })
}

export function useInvitePreview(code: string) {
  return useQuery({
    queryKey: tripKeys.invite(code),
    queryFn: () => tripsApi.previewInvite(code),
    enabled: code.trim().length > 0,
  })
}

/** Cập nhật cache chi tiết + làm mới danh sách sau mỗi thay đổi. */
export function useTripCacheSync() {
  const qc = useQueryClient()
  return {
    setDetail: (trip: TripDetailResponse) => {
      const detailKey = tripKeys.detail(trip.id)
      qc.setQueryData(detailKey, trip)
      return Promise.all([
        qc.invalidateQueries({ queryKey: tripKeys.list() }),
        // Mọi dữ liệu con của trip (lịch rảnh, ngày đi, lịch trình, checklist), trừ chính detail
        qc.invalidateQueries({ queryKey: detailKey, predicate: (q) => q.queryKey.length > detailKey.length }),
      ])
    },
    refresh: (tripId: number) =>
      Promise.all([
        qc.invalidateQueries({ queryKey: tripKeys.detail(tripId) }),
        qc.invalidateQueries({ queryKey: tripKeys.list() }),
      ]),
    forget: (tripId: number) => {
      qc.removeQueries({ queryKey: tripKeys.detail(tripId) })
      return qc.invalidateQueries({ queryKey: tripKeys.list() })
    },
  }
}

export function useCreateTrip() {
  const sync = useTripCacheSync()
  return useMutation({
    mutationFn: (body: TripRequest) => tripsApi.create(body),
    onSuccess: (trip) => sync.setDetail(trip),
  })
}

export function useUpdateTrip(tripId: number) {
  const sync = useTripCacheSync()
  return useMutation({
    mutationFn: (body: TripRequest) => tripsApi.update(tripId, body),
    onSuccess: (trip) => sync.setDetail(trip),
  })
}

export function useDeleteTrip(tripId: number) {
  const sync = useTripCacheSync()
  return useMutation({
    mutationFn: () => tripsApi.remove(tripId),
    onSuccess: () => sync.forget(tripId),
  })
}

export function useRegenerateInviteCode(tripId: number) {
  const sync = useTripCacheSync()
  return useMutation({
    mutationFn: () => tripsApi.regenerateInviteCode(tripId),
    onSuccess: () => sync.refresh(tripId),
  })
}

export function useJoinTrip() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (code: string) => tripsApi.join(code),
    onSuccess: () => qc.invalidateQueries({ queryKey: tripKeys.all }),
  })
}

export function useChangeRole(tripId: number) {
  const sync = useTripCacheSync()
  return useMutation({
    mutationFn: ({ userId, role }: { userId: number; role: TripRole }) => tripsApi.changeRole(tripId, userId, { role }),
    onSuccess: () => sync.refresh(tripId),
  })
}

export function useTransferOwnership(tripId: number) {
  const sync = useTripCacheSync()
  return useMutation({
    mutationFn: (userId: number) => tripsApi.transferOwnership(tripId, { userId }),
    onSuccess: () => sync.refresh(tripId),
  })
}

/** Xóa thành viên khác, hoặc tự rời nhóm khi userId là chính mình. */
export function useRemoveMember(tripId: number) {
  const sync = useTripCacheSync()
  return useMutation({
    mutationFn: (userId: number) => tripsApi.removeMember(tripId, userId),
    onSuccess: () => sync.refresh(tripId),
  })
}
