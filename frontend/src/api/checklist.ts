import { api } from '@/lib/api'
import type { ChecklistItemRequest, ChecklistResponse } from '@/types/checklist'

/** Mọi thao tác ghi đều trả lại toàn bộ checklist. */
export const checklistApi = {
  get: (tripId: number) => api.get<ChecklistResponse>(`/trips/${tripId}/checklist`).then((r) => r.data),
  create: (tripId: number, body: ChecklistItemRequest) =>
    api.post<ChecklistResponse>(`/trips/${tripId}/checklist`, body).then((r) => r.data),
  update: (itemId: number, body: ChecklistItemRequest) =>
    api.put<ChecklistResponse>(`/checklist-items/${itemId}`, body).then((r) => r.data),
  remove: (itemId: number) => api.delete<ChecklistResponse>(`/checklist-items/${itemId}`).then((r) => r.data),
  claim: (itemId: number) => api.post<ChecklistResponse>(`/checklist-items/${itemId}/claim`).then((r) => r.data),
  unclaim: (itemId: number) => api.delete<ChecklistResponse>(`/checklist-items/${itemId}/claim`).then((r) => r.data),
  check: (itemId: number, checked: boolean) =>
    api.patch<ChecklistResponse>(`/checklist-items/${itemId}/check`, { checked }).then((r) => r.data),
}
