import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { mediaApi } from '@/api/media'
import { compressImage } from '@/lib/imageCompress'
import type { MediaPurpose } from '@/types/media'

const EXTENSION: Record<string, string> = { 'image/webp': 'webp', 'image/jpeg': 'jpg', 'image/png': 'png' }

/** Nén ở client rồi upload; {@code progress} 0–100 trong lúc gửi, null khi rảnh. */
export function useUploadImage(purpose: MediaPurpose) {
  const [progress, setProgress] = useState<number | null>(null)
  const mutation = useMutation({
    mutationFn: async (file: File) => {
      setProgress(0)
      const blob = await compressImage(file)
      const name = `${file.name.replace(/\.[^.]+$/, '') || 'anh'}.${EXTENSION[blob.type] ?? 'jpg'}`
      return mediaApi.upload(blob, name, purpose, setProgress)
    },
    onSettled: () => setProgress(null),
  })
  return { ...mutation, progress }
}
