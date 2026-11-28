import { api } from '@/lib/api'
import type { PackingItemRequest, PackingListResponse, PackingTemplateResponse } from '@/types/packing'

/** Hành lý cá nhân: mọi thao tác ghi trả lại toàn bộ danh sách của chính mình. */
export const packingApi = {
  list: (tripId: number) => api.get<PackingListResponse>(`/trips/${tripId}/packing`).then((r) => r.data),
  add: (tripId: number, body: PackingItemRequest) =>
    api.post<PackingListResponse>(`/trips/${tripId}/packing`, body).then((r) => r.data),
  addTemplate: (tripId: number, key: string) =>
    api.post<PackingListResponse>(`/trips/${tripId}/packing/templates/${key}`).then((r) => r.data),
  update: (itemId: number, body: PackingItemRequest) =>
    api.put<PackingListResponse>(`/packing-items/${itemId}`, body).then((r) => r.data),
  setPacked: (itemId: number, packed: boolean) =>
    api.patch<PackingListResponse>(`/packing-items/${itemId}/packed`, { packed }).then((r) => r.data),
  remove: (itemId: number) => api.delete<PackingListResponse>(`/packing-items/${itemId}`).then((r) => r.data),
  templates: () => api.get<PackingTemplateResponse[]>('/packing-templates').then((r) => r.data),
}
