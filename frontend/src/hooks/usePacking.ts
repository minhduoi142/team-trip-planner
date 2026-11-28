import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRef } from 'react'
import { packingApi } from '@/api/packing'
import { applyLatest, revertLatest } from '@/lib/overlapSafe'
import type { PackingItemRequest, PackingListResponse } from '@/types/packing'
import { tripKeys } from './useTrips'

/** Hành lý của chính mình (docs/sdd-packing-list.md). Poll 15 s mặc định: có thể mở trên 2 máy. */
export function usePacking(tripId: number) {
  return useQuery({ queryKey: tripKeys.packing(tripId), queryFn: () => packingApi.list(tripId) })
}

/** Danh sách mẫu là hằng số phía server: tải 1 lần. */
export function usePackingTemplates() {
  return useQuery({
    queryKey: ['packing-templates'],
    queryFn: packingApi.templates,
    refetchInterval: false,
    staleTime: Infinity,
  })
}

function usePackingMutation<TVars>(tripId: number, fn: (vars: TVars) => Promise<PackingListResponse>) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onMutate: () => qc.cancelQueries({ queryKey: tripKeys.packing(tripId) }),
    onSuccess: (data) => qc.setQueryData(tripKeys.packing(tripId), data),
  })
}

export function useAddPackingItem(tripId: number) {
  return usePackingMutation(tripId, (body: PackingItemRequest) => packingApi.add(tripId, body))
}

export function useAddPackingTemplate(tripId: number) {
  return usePackingMutation(tripId, (key: string) => packingApi.addTemplate(tripId, key))
}

export function useUpdatePackingItem(tripId: number) {
  return usePackingMutation(tripId, ({ itemId, body }: { itemId: number; body: PackingItemRequest }) =>
    packingApi.update(itemId, body),
  )
}

export function useDeletePackingItem(tripId: number) {
  return usePackingMutation(tripId, (itemId: number) => packingApi.remove(itemId))
}

/** Tích "đã xếp": cập nhật ngay trên UI, lỗi thì trả lại như cũ. */
export function useSetPacked(tripId: number) {
  const qc = useQueryClient()
  const key = tripKeys.packing(tripId)
  const mutationKey = [...key, 'set-packed']
  const overlapped = useRef(false)
  return useMutation({
    mutationKey,
    mutationFn: ({ itemId, packed }: { itemId: number; packed: boolean }) => packingApi.setPacked(itemId, packed),
    onMutate: async ({ itemId, packed }) => {
      await qc.cancelQueries({ queryKey: key })
      const previous = qc.getQueryData<PackingListResponse>(key)
      if (previous) {
        const items = previous.items.map((item) => (item.id === itemId ? { ...item, packed } : item))
        qc.setQueryData<PackingListResponse>(key, {
          ...previous,
          items,
          packedCount: items.filter((item) => item.packed).length,
        })
      }
      return { previous }
    },
    onError: (_error, _vars, context) => revertLatest(qc, mutationKey, key, context?.previous, overlapped),
    onSuccess: (data) => applyLatest(qc, mutationKey, key, data, overlapped),
  })
}
