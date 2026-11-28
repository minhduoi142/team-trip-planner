import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { outfitApi } from '@/api/outfit'
import type { OutfitBoardResponse, OutfitRequest } from '@/types/outfit'
import { tripKeys } from './useTrips'

/** Bảng outfit của chuyến. Ít đổi, có ảnh: poll thưa như album (docs/sdd-golden-hour-outfit.md B.6). */
export function useOutfits(tripId: number) {
  return useQuery({
    queryKey: tripKeys.outfits(tripId),
    queryFn: () => outfitApi.board(tripId),
    refetchInterval: 60_000,
  })
}

function useOutfitMutation<TVars>(tripId: number, fn: (vars: TVars) => Promise<OutfitBoardResponse>) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: fn,
    // Poll đang chạy không được ghi đè kết quả vừa ghi
    onMutate: () => qc.cancelQueries({ queryKey: tripKeys.outfits(tripId) }),
    onSuccess: (data) => qc.setQueryData(tripKeys.outfits(tripId), data),
  })
}

export function useSaveMyOutfit(tripId: number) {
  return useOutfitMutation(tripId, ({ dayId, body }: { dayId: number; body: OutfitRequest }) =>
    outfitApi.saveMine(dayId, body),
  )
}

export function useDeleteMyOutfit(tripId: number) {
  return useOutfitMutation(tripId, (dayId: number) => outfitApi.deleteMine(dayId))
}

/** OWNER gỡ outfit của người khác */
export function useDeleteOutfitOf(tripId: number) {
  return useOutfitMutation(tripId, ({ dayId, userId }: { dayId: number; userId: number }) =>
    outfitApi.deleteOf(dayId, userId),
  )
}
