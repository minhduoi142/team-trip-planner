import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { albumApi } from '@/api/album'
import type { AddPhotosRequest, AlbumResponse, UpdatePhotoRequest } from '@/types/album'
import { tripKeys } from './useTrips'

export function useAlbum(tripId: number) {
  // Album ít đổi và lưới ảnh nặng: poll thưa hơn mặc định 15 s (docs/ui-slop-audit.md P3-AL-04)
  return useQuery({ queryKey: tripKeys.album(tripId), queryFn: () => albumApi.get(tripId), refetchInterval: 60_000 })
}

function useAlbumMutation<TVars>(tripId: number, fn: (vars: TVars) => Promise<AlbumResponse>) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: (data) => qc.setQueryData(tripKeys.album(tripId), data),
  })
}

/** Đổi link thư mục cũng đổi driveFolderUrl của trip → làm mới chi tiết. */
export function useSetAlbumFolder(tripId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (url: string | null) => albumApi.setFolder(tripId, url),
    onSuccess: (data) => {
      qc.setQueryData(tripKeys.album(tripId), data)
      return qc.invalidateQueries({ queryKey: tripKeys.detail(tripId), exact: true })
    },
  })
}

export function useAddAlbumPhotos(tripId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: AddPhotosRequest) => albumApi.addPhotos(tripId, body),
    onSuccess: (data) => qc.setQueryData(tripKeys.album(tripId), data.album),
  })
}

export function useUpdateAlbumPhoto(tripId: number) {
  return useAlbumMutation(tripId, ({ photoId, body }: { photoId: number; body: UpdatePhotoRequest }) =>
    albumApi.updatePhoto(photoId, body),
  )
}

export function useDeleteAlbumPhoto(tripId: number) {
  return useAlbumMutation(tripId, (photoId: number) => albumApi.deletePhoto(photoId))
}
