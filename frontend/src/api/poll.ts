import { api } from '@/lib/api'
import type { ClosePollRequest, CreatePollRequest, PollListResponse, PollOptionRequest } from '@/types/poll'

/** Mọi thao tác ghi trả lại toàn bộ bình chọn của chuyến. */
export const pollApi = {
  list: (tripId: number) => api.get<PollListResponse>(`/trips/${tripId}/polls`).then((r) => r.data),
  create: (tripId: number, body: CreatePollRequest) =>
    api.post<PollListResponse>(`/trips/${tripId}/polls`, body).then((r) => r.data),
  remove: (pollId: number) => api.delete<PollListResponse>(`/polls/${pollId}`).then((r) => r.data),
  addOption: (pollId: number, body: PollOptionRequest) =>
    api.post<PollListResponse>(`/polls/${pollId}/options`, body).then((r) => r.data),
  removeOption: (optionId: number) => api.delete<PollListResponse>(`/poll-options/${optionId}`).then((r) => r.data),
  vote: (optionId: number) => api.put<PollListResponse>(`/poll-options/${optionId}/vote`).then((r) => r.data),
  unvote: (optionId: number) => api.delete<PollListResponse>(`/poll-options/${optionId}/vote`).then((r) => r.data),
  close: (pollId: number, body: ClosePollRequest) =>
    api.post<PollListResponse>(`/polls/${pollId}/close`, body).then((r) => r.data),
  reopen: (pollId: number) => api.post<PollListResponse>(`/polls/${pollId}/reopen`).then((r) => r.data),
}
