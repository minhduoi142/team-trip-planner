import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { checklistApi } from '@/api/checklist'
import type { ChecklistItemRequest, ChecklistResponse } from '@/types/checklist'
import { tripKeys } from './useTrips'

export function useChecklist(tripId: number) {
  return useQuery({ queryKey: tripKeys.checklist(tripId), queryFn: () => checklistApi.get(tripId) })
}

function useChecklistMutation<TVars>(tripId: number, fn: (vars: TVars) => Promise<ChecklistResponse>) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: (data) => qc.setQueryData(tripKeys.checklist(tripId), data),
  })
}

export function useCreateChecklistItem(tripId: number) {
  return useChecklistMutation(tripId, (body: ChecklistItemRequest) => checklistApi.create(tripId, body))
}

export function useUpdateChecklistItem(tripId: number) {
  return useChecklistMutation(tripId, ({ itemId, body }: { itemId: number; body: ChecklistItemRequest }) =>
    checklistApi.update(itemId, body),
  )
}

export function useDeleteChecklistItem(tripId: number) {
  return useChecklistMutation(tripId, (itemId: number) => checklistApi.remove(itemId))
}

export function useClaimItem(tripId: number) {
  return useChecklistMutation(tripId, (itemId: number) => checklistApi.claim(itemId))
}

export function useUnclaimItem(tripId: number) {
  return useChecklistMutation(tripId, (itemId: number) => checklistApi.unclaim(itemId))
}

/** Tick: đổi ngay trên UI (optimistic), lỗi thì trả lại. */
export function useCheckItem(tripId: number) {
  const qc = useQueryClient()
  const key = tripKeys.checklist(tripId)
  return useMutation({
    mutationFn: ({ itemId, checked }: { itemId: number; checked: boolean }) => checklistApi.check(itemId, checked),
    onMutate: async ({ itemId, checked }) => {
      await qc.cancelQueries({ queryKey: key })
      const previous = qc.getQueryData<ChecklistResponse>(key)
      if (previous) {
        const items = previous.items.map((item) => (item.id === itemId ? { ...item, checked } : item))
        qc.setQueryData<ChecklistResponse>(key, {
          ...previous,
          items,
          checked: items.filter((item) => item.checked).length,
        })
      }
      return { previous }
    },
    onError: (_error, _vars, context) => {
      if (context?.previous) qc.setQueryData(key, context.previous)
    },
    onSuccess: (data) => qc.setQueryData(key, data),
  })
}
