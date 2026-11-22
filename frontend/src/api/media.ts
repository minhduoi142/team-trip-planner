import { api } from '@/lib/api'
import type { MediaPurpose, MediaResponse } from '@/types/media'

export const mediaApi = {
  /**
   * multipart/form-data. PHẢI ghi đè Content-Type: instance mặc định là application/json, axios 1.x sẽ tự
   * đổi FormData thành JSON; đặt multipart thì axios giữ FormData và để trình duyệt tự thêm boundary.
   */
  upload: (file: Blob, fileName: string, purpose: MediaPurpose, onProgress?: (percent: number) => void) => {
    const form = new FormData()
    form.append('file', file, fileName)
    form.append('purpose', purpose)
    return api
      .post<MediaResponse>('/media', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (event) => {
          if (onProgress && event.total) onProgress(Math.round((event.loaded / event.total) * 100))
        },
      })
      .then((r) => r.data)
  },
}
