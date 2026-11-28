import { useState } from 'react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { useDeleteMyOutfit, useDeleteOutfitOf, useOutfits, useSaveMyOutfit } from '@/hooks/useOutfits'
import { getErrorMessage } from '@/lib/api'
import type { ItineraryDayResponse } from '@/types/itinerary'
import type { OutfitResponse } from '@/types/outfit'
import { OutfitDialog } from './OutfitDialog'
import { OutfitEditor } from './OutfitEditor'
import { OutfitStrip } from './OutfitStrip'

interface DayOutfitsProps {
  tripId: number
  /** Ngày đang xem ở tab Lịch trình */
  day: ItineraryDayResponse
  /** Mọi ngày của lịch trình (lấy màu dress code + nhãn khi đổi ngày trong hộp thoại) */
  days: ItineraryDayResponse[]
  memberCount: number
}

/** Phần outfit của một ngày: dải tóm tắt + hộp thoại xem cả nhóm + form outfit của mình (sdd-golden-hour-outfit B). */
export function DayOutfits({ tripId, day, days, memberCount }: DayOutfitsProps) {
  const board = useOutfits(tripId)
  const save = useSaveMyOutfit(tripId)
  const removeMine = useDeleteMyOutfit(tripId)
  const removeOf = useDeleteOutfitOf(tripId)

  const [viewer, setViewer] = useState<{ dayId: number; focusUserId: number | null } | null>(null)
  const [editingDayId, setEditingDayId] = useState<number | null>(null)
  const [toRemove, setToRemove] = useState<{ dayId: number; outfit: OutfitResponse } | null>(null)

  if (!board.data) return null // đang tải / lỗi: dải này phụ, không chiếm chỗ

  const boardDays = board.data.days
  const outfitsOf = (dayId: number) => boardDays.find((d) => d.dayId === dayId)?.outfits ?? []
  const dressColorsOf = (dayId: number) => days.find((d) => d.id === dayId)?.dress.colors ?? []
  const labelOf = (dayId: number) => `Ngày ${days.find((d) => d.id === dayId)?.dayIndex ?? ''}`
  const onError = (e: unknown) => toast.error(getErrorMessage(e))
  const editingCurrent = editingDayId === null ? null : (outfitsOf(editingDayId).find((o) => o.mine) ?? null)

  return (
    <>
      <OutfitStrip
        outfits={outfitsOf(day.id)}
        memberCount={memberCount}
        onOpen={(focusUserId) => setViewer({ dayId: day.id, focusUserId })}
        onEditMine={() => setEditingDayId(day.id)}
      />

      <OutfitDialog
        open={viewer !== null}
        onOpenChange={(open) => !open && setViewer(null)}
        days={boardDays}
        dayId={viewer?.dayId ?? day.id}
        onDayChange={(dayId) => setViewer({ dayId, focusUserId: null })}
        focusUserId={viewer?.focusUserId ?? null}
        dressColorsOf={dressColorsOf}
        onEditMine={setEditingDayId}
        onRemove={(dayId, outfit) => setToRemove({ dayId, outfit })}
      />

      <OutfitEditor
        open={editingDayId !== null}
        onOpenChange={(open) => !open && setEditingDayId(null)}
        dayLabel={editingDayId === null ? '' : labelOf(editingDayId)}
        dressColors={editingDayId === null ? [] : dressColorsOf(editingDayId)}
        current={editingCurrent}
        pending={save.isPending || removeMine.isPending}
        onSubmit={(body) =>
          editingDayId !== null &&
          save.mutate(
            { dayId: editingDayId, body },
            {
              onSuccess: () => {
                setEditingDayId(null)
                toast.success('Đã lưu outfit')
              },
              onError,
            },
          )
        }
        onRemove={() =>
          editingDayId !== null &&
          removeMine.mutate(editingDayId, {
            onSuccess: () => {
              setEditingDayId(null)
              toast.success('Đã gỡ outfit')
            },
            onError,
          })
        }
      />

      <ConfirmDialog
        open={toRemove !== null}
        onOpenChange={(open) => !open && setToRemove(null)}
        title="Gỡ outfit này?"
        description={
          toRemove ? `Outfit của ${toRemove.outfit.displayName} sẽ bị gỡ khỏi ${labelOf(toRemove.dayId)}.` : ''
        }
        confirmLabel="Gỡ outfit"
        destructive
        pending={removeOf.isPending}
        onConfirm={() =>
          toRemove &&
          removeOf.mutate(
            { dayId: toRemove.dayId, userId: toRemove.outfit.userId },
            {
              onSuccess: () => {
                setToRemove(null)
                toast.success('Đã gỡ outfit')
              },
              onError,
            },
          )
        }
      />
    </>
  )
}
