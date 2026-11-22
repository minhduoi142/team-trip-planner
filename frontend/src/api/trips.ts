import { api } from '@/lib/api'
import type {
  ChangeRoleRequest,
  InviteCodeResponse,
  InvitePreviewResponse,
  JoinTripResponse,
  TransferOwnershipRequest,
  TripDetailResponse,
  TripMemberResponse,
  TripRequest,
  TripSummaryResponse,
} from '@/types/trip'

const code = (value: string) => encodeURIComponent(value.trim())

export const tripsApi = {
  list: () => api.get<TripSummaryResponse[]>('/trips').then((r) => r.data),
  get: (tripId: number) => api.get<TripDetailResponse>(`/trips/${tripId}`).then((r) => r.data),
  create: (body: TripRequest) => api.post<TripDetailResponse>('/trips', body).then((r) => r.data),
  update: (tripId: number, body: TripRequest) =>
    api.patch<TripDetailResponse>(`/trips/${tripId}`, body).then((r) => r.data),
  remove: (tripId: number) => api.delete<void>(`/trips/${tripId}`).then(() => undefined),
  regenerateInviteCode: (tripId: number) =>
    api.post<InviteCodeResponse>(`/trips/${tripId}/invite-code/regenerate`).then((r) => r.data),
  previewInvite: (inviteCode: string) =>
    api.get<InvitePreviewResponse>(`/trips/invite/${code(inviteCode)}`).then((r) => r.data),
  join: (inviteCode: string) => api.post<JoinTripResponse>(`/trips/join/${code(inviteCode)}`).then((r) => r.data),

  changeRole: (tripId: number, userId: number, body: ChangeRoleRequest) =>
    api.patch<TripMemberResponse>(`/trips/${tripId}/members/${userId}`, body).then((r) => r.data),
  transferOwnership: (tripId: number, body: TransferOwnershipRequest) =>
    api.post<void>(`/trips/${tripId}/transfer-ownership`, body).then(() => undefined),
  removeMember: (tripId: number, userId: number) =>
    api.delete<void>(`/trips/${tripId}/members/${userId}`).then(() => undefined),
}
