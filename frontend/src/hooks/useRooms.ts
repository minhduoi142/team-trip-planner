import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { roomApi } from '@/api/room'
import type { RoomListResponse, RoomRequest } from '@/types/room'
import { tripKeys } from './useTrips'

export function useRooms(tripId: number) {
  return useQuery({ queryKey: tripKeys.rooms(tripId), queryFn: () => roomApi.list(tripId) })
}

function useRoomMutation<TVars>(tripId: number, fn: (vars: TVars) => Promise<RoomListResponse>) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: (data) => qc.setQueryData(tripKeys.rooms(tripId), data),
  })
}

export function useCreateRoom(tripId: number) {
  return useRoomMutation(tripId, (body: RoomRequest) => roomApi.create(tripId, body))
}

export function useUpdateRoom(tripId: number) {
  return useRoomMutation(tripId, ({ roomId, body }: { roomId: number; body: RoomRequest }) =>
    roomApi.update(roomId, body),
  )
}

export function useDeleteRoom(tripId: number) {
  return useRoomMutation(tripId, (roomId: number) => roomApi.remove(roomId))
}

export function useAssignRoom(tripId: number) {
  return useRoomMutation(tripId, ({ roomId, userId }: { roomId: number; userId: number }) =>
    roomApi.assign(roomId, userId),
  )
}

export function useUnassignRoom(tripId: number) {
  return useRoomMutation(tripId, ({ roomId, userId }: { roomId: number; userId: number }) =>
    roomApi.unassign(roomId, userId),
  )
}
