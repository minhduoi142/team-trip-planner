import { api } from '@/lib/api'
import type { RoomListResponse, RoomRequest } from '@/types/room'

/** Mọi thao tác ghi trả lại toàn bộ danh sách phòng. */
export const roomApi = {
  list: (tripId: number) => api.get<RoomListResponse>(`/trips/${tripId}/rooms`).then((r) => r.data),
  create: (tripId: number, body: RoomRequest) =>
    api.post<RoomListResponse>(`/trips/${tripId}/rooms`, body).then((r) => r.data),
  update: (roomId: number, body: RoomRequest) =>
    api.put<RoomListResponse>(`/rooms/${roomId}`, body).then((r) => r.data),
  remove: (roomId: number) => api.delete<RoomListResponse>(`/rooms/${roomId}`).then((r) => r.data),
  assign: (roomId: number, userId: number) =>
    api.put<RoomListResponse>(`/rooms/${roomId}/members/${userId}`).then((r) => r.data),
  unassign: (roomId: number, userId: number) =>
    api.delete<RoomListResponse>(`/rooms/${roomId}/members/${userId}`).then((r) => r.data),
}
