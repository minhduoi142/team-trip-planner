import { api } from '@/lib/api'
import type { AddPhotosRequest, AddPhotosResponse, AlbumResponse, UpdatePhotoRequest } from '@/types/album'

export const albumApi = {
  get: (tripId: number) => api.get<AlbumResponse>(`/trips/${tripId}/album`).then((r) => r.data),
  setFolder: (tripId: number, url: string | null) =>
    api.put<AlbumResponse>(`/trips/${tripId}/album/folder`, { url }).then((r) => r.data),
  addPhotos: (tripId: number, body: AddPhotosRequest) =>
    api.post<AddPhotosResponse>(`/trips/${tripId}/album/photos`, body).then((r) => r.data),
  updatePhoto: (photoId: number, body: UpdatePhotoRequest) =>
    api.patch<AlbumResponse>(`/album-photos/${photoId}`, body).then((r) => r.data),
  deletePhoto: (photoId: number) => api.delete<AlbumResponse>(`/album-photos/${photoId}`).then((r) => r.data),
}
