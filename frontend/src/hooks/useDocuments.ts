import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { documentApi } from '@/api/document'
import { compressImage } from '@/lib/imageCompress'
import type { DocumentListResponse, DocumentRequest } from '@/types/document'
import { tripKeys } from './useTrips'

/** Ví giấy tờ (docs/sdd-trip-documents.md). Ít đổi: poll 60 s như album. */
export function useDocuments(tripId: number) {
  return useQuery({
    queryKey: tripKeys.documents(tripId),
    queryFn: () => documentApi.list(tripId),
    refetchInterval: 60_000,
  })
}

function useDocumentMutation<TVars>(tripId: number, fn: (vars: TVars) => Promise<DocumentListResponse>) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onMutate: () => qc.cancelQueries({ queryKey: tripKeys.documents(tripId) }),
    onSuccess: (data) => qc.setQueryData(tripKeys.documents(tripId), data),
  })
}

export function useCreateDocument(tripId: number) {
  return useDocumentMutation(tripId, (body: DocumentRequest) => documentApi.create(tripId, body))
}

export function useUpdateDocument(tripId: number) {
  return useDocumentMutation(tripId, ({ id, body }: { id: number; body: DocumentRequest }) =>
    documentApi.update(id, body),
  )
}

export function useDeleteDocument(tripId: number) {
  return useDocumentMutation(tripId, (id: number) => documentApi.remove(id))
}

export function useRemoveDocumentFile(tripId: number) {
  return useDocumentMutation(tripId, (id: number) => documentApi.removeFile(id))
}

const IMAGE_EXT: Record<string, string> = { 'image/webp': 'webp', 'image/jpeg': 'jpg', 'image/png': 'png' }

/** Ảnh: nén ở client như upload ảnh khác (1920px vẫn đọc rõ mã QR trên vé). PDF: gửi nguyên. */
export function useUploadDocumentFile(tripId: number) {
  const qc = useQueryClient()
  const [progress, setProgress] = useState<number | null>(null)
  const mutation = useMutation({
    mutationFn: async ({ id, file }: { id: number; file: File }) => {
      setProgress(0)
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        return documentApi.uploadFile(id, file, file.name, setProgress)
      }
      const blob = await compressImage(file)
      const name = `${file.name.replace(/\.[^.]+$/, '') || 'giay-to'}.${IMAGE_EXT[blob.type] ?? 'jpg'}`
      return documentApi.uploadFile(id, blob, name, setProgress)
    },
    onMutate: () => qc.cancelQueries({ queryKey: tripKeys.documents(tripId) }),
    onSuccess: (data) => qc.setQueryData(tripKeys.documents(tripId), data),
    onSettled: () => setProgress(null),
  })
  return { ...mutation, progress }
}

/**
 * Tải file riêng tư của 1 giấy tờ thành Blob (chỉ khi `enabled`). Key ngoài `detail`: không poll, không bị làm mới
 * theo chuyến; `updatedAt` trong key để thay file thì tải lại. gcTime ngắn: không giữ vé/CCCD lâu trong bộ nhớ.
 */
export function useDocumentFile(id: number, updatedAt: string, enabled: boolean) {
  return useQuery({
    queryKey: ['document-file', id, updatedAt],
    queryFn: () => documentApi.downloadFile(id),
    enabled,
    refetchInterval: false,
    refetchOnWindowFocus: false,
    staleTime: Infinity,
    gcTime: 60_000,
    retry: false,
  })
}
