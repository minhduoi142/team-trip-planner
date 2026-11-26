import { api } from '@/lib/api'
import type { ProposalListResponse, ProposalRequest, ScheduleProposalRequest } from '@/types/proposal'

/** Mọi thao tác trả lại toàn bộ wishlist của chuyến. */
export const proposalApi = {
  list: (tripId: number) => api.get<ProposalListResponse>(`/trips/${tripId}/proposals`).then((r) => r.data),
  create: (tripId: number, body: ProposalRequest) =>
    api.post<ProposalListResponse>(`/trips/${tripId}/proposals`, body).then((r) => r.data),
  update: (proposalId: number, body: ProposalRequest) =>
    api.put<ProposalListResponse>(`/proposals/${proposalId}`, body).then((r) => r.data),
  remove: (proposalId: number) => api.delete<ProposalListResponse>(`/proposals/${proposalId}`).then((r) => r.data),
  vote: (proposalId: number) => api.put<ProposalListResponse>(`/proposals/${proposalId}/vote`).then((r) => r.data),
  unvote: (proposalId: number) => api.delete<ProposalListResponse>(`/proposals/${proposalId}/vote`).then((r) => r.data),
  schedule: (proposalId: number, body: ScheduleProposalRequest) =>
    api.post<ProposalListResponse>(`/proposals/${proposalId}/schedule`, body).then((r) => r.data),
}
