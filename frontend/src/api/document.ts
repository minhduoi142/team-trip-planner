import { api } from '@/lib/api'
import type { DocumentListResponse, DocumentRequest } from '@/types/document'

/** Ví giấy tờ: mọi thao tác ghi trả lại toàn bộ danh sách người gọi được thấy. */
export const documentApi = {
  list: (tripId: number) => api.get<DocumentListResponse>(`/trips/${tripId}/documents`).then((r) => r.data),
  create: (tripId: number, body: DocumentRequest) =>
    api.post<DocumentListResponse>(`/trips/${tripId}/documents`, body).then((r) => r.data),
  update: (id: number, body: DocumentRequest) =>
    api.put<DocumentListResponse>(`/documents/${id}`, body).then((r) => r.data),
  remove: (id: number) => api.delete<DocumentListResponse>(`/documents/${id}`).then((r) => r.data),
  /** multipart: PHẢI ghi đè Content-Type (xem api/media.ts) */
  uploadFile: (id: number, file: Blob, fileName: string, onProgress?: (percent: number) => void) => {
    const form = new FormData()
    form.append('file', file, fileName)
    return api
      .put<DocumentListResponse>(`/documents/${id}/file`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (event) => {
          if (onProgress && event.total) onProgress(Math.round((event.loaded / event.total) * 100))
        },
      })
      .then((r) => r.data)
  },
  removeFile: (id: number) => api.delete<DocumentListResponse>(`/documents/${id}/file`).then((r) => r.data),
  /** File ở kho riêng tư: tải qua API (có token) thành Blob, không có URL công khai */
  downloadFile: (id: number) => api.get<Blob>(`/documents/${id}/file`, { responseType: 'blob' }).then((r) => r.data),
}
