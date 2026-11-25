import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { itineraryApi } from '@/api/itinerary'
import type { ItineraryItemRequest, ItineraryResponse, UpdateDayRequest } from '@/types/itinerary'
import { tripKeys } from './useTrips'

export function useItinerary(tripId: number) {
  return useQuery({ queryKey: tripKeys.itinerary(tripId), queryFn: () => itineraryApi.get(tripId) })
}

/** Mutation trả về toàn bộ lịch trình → ghi thẳng vào cache. */
function useItineraryMutation<TVars>(tripId: number, fn: (vars: TVars) => Promise<ItineraryResponse>) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: (data) => qc.setQueryData(tripKeys.itinerary(tripId), data),
  })
}

export function useAddItem(tripId: number) {
  return useItineraryMutation(tripId, ({ dayId, body }: { dayId: number; body: ItineraryItemRequest }) =>
    itineraryApi.addItem(dayId, body),
  )
}

export function useUpdateItem(tripId: number) {
  return useItineraryMutation(tripId, ({ itemId, body }: { itemId: number; body: ItineraryItemRequest }) =>
    itineraryApi.updateItem(itemId, body),
  )
}

export function useDeleteItem(tripId: number) {
  return useItineraryMutation(tripId, (itemId: number) => itineraryApi.deleteItem(itemId))
}

export function useMoveItem(tripId: number) {
  return useItineraryMutation(tripId, ({ itemId, dayId }: { itemId: number; dayId: number }) =>
    itineraryApi.move(itemId, dayId),
  )
}

/** Sửa ngày có thể đổi vị trí riêng của ngày → làm mới thời tiết (query này không poll). */
export function useUpdateDay(tripId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ dayId, body }: { dayId: number; body: UpdateDayRequest }) => itineraryApi.updateDay(dayId, body),
    onSuccess: (data) => {
      qc.setQueryData(tripKeys.itinerary(tripId), data)
      return qc.invalidateQueries({ queryKey: tripKeys.weather(tripId) })
    },
  })
}

export function useDeleteOverflowDay(tripId: number) {
  return useItineraryMutation(tripId, (dayId: number) => itineraryApi.deleteOverflowDay(dayId))
}

/** Kéo thả trong ngày: đổi thứ tự ngay trên UI (optimistic), lỗi thì trả lại như cũ. */
export function useReorderItems(tripId: number) {
  const qc = useQueryClient()
  const key = tripKeys.itinerary(tripId)
  return useMutation({
    mutationFn: ({ dayId, itemIds }: { dayId: number; itemIds: number[] }) => itineraryApi.reorder(dayId, itemIds),
    onMutate: async ({ dayId, itemIds }) => {
      await qc.cancelQueries({ queryKey: key })
      const previous = qc.getQueryData<ItineraryResponse>(key)
      if (previous) {
        qc.setQueryData<ItineraryResponse>(key, {
          ...previous,
          days: previous.days.map((day) => {
            if (day.id !== dayId) return day
            const byId = new Map(day.items.map((item) => [item.id, item]))
            return {
              ...day,
              items: itemIds.flatMap((id, index) => {
                const item = byId.get(id)
                return item ? [{ ...item, sortOrder: index }] : []
              }),
            }
          }),
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
