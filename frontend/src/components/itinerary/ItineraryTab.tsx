import {
  closestCenter,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  pointerWithin,
  TouchSensor,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CalendarCheck, Plus, RotateCw, Trash2, TriangleAlert } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  useAddItem,
  useDeleteItem,
  useDeleteOverflowDay,
  useItinerary,
  useMoveItem,
  useReorderItems,
  useUpdateDay,
  useUpdateItem,
} from '@/hooks/useItinerary'
import { getErrorMessage } from '@/lib/api'
import { formatVnd } from '@/lib/tripContent'
import type { ItineraryItemRequest, ItineraryItemResponse } from '@/types/itinerary'
import { DayPills } from './DayPills'
import { DressCodeCard } from './DressCodeCard'
import { DressCodeDialog } from './DressCodeDialog'
import { ItemCard, ItemCardBody } from './ItemCard'
import { ItemFormDialog } from './ItemFormDialog'
import { dayLabel } from './dayLabel'
import { itemDndId, parseDayDndId, parseItemDndId } from './dndIds'

/** Ưu tiên vùng thả là viên ngày dưới con trỏ; ngoài ra sắp xếp trong danh sách theo item gần nhất. */
const collisionDetection: CollisionDetection = (args) => {
  const pill = pointerWithin(args).find((c) => parseDayDndId(c.id) !== null)
  return pill ? [pill] : closestCenter(args)
}

interface ItineraryTabProps {
  tripId: number
  canEdit: boolean
}

export function ItineraryTab({ tripId, canEdit }: ItineraryTabProps) {
  const itinerary = useItinerary(tripId)
  const addItem = useAddItem(tripId)
  const updateItem = useUpdateItem(tripId)
  const deleteItem = useDeleteItem(tripId)
  const moveItem = useMoveItem(tripId)
  const reorder = useReorderItems(tripId)
  const updateDay = useUpdateDay(tripId)
  const deleteOverflowDay = useDeleteOverflowDay(tripId)

  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [itemDialog, setItemDialog] = useState<{ item?: ItineraryItemResponse } | null>(null)
  const [dressOpen, setDressOpen] = useState(false)
  const [toDelete, setToDelete] = useState<ItineraryItemResponse | null>(null)
  const [deleteDayOpen, setDeleteDayOpen] = useState(false)
  const [activeItem, setActiveItem] = useState<ItineraryItemResponse | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  if (itinerary.isPending) {
    return (
      <div className="grid gap-3">
        <Skeleton className="h-16 rounded-full" />
        <Skeleton className="h-28 rounded-3xl" />
        <Skeleton className="h-48 rounded-3xl" />
      </div>
    )
  }
  if (itinerary.isError) {
    return (
        <div className="rounded-3xl border-2 border-dashed border-rose-200/80 bg-card/80 p-8 text-center shadow-clay-card">
          <p className="text-muted-foreground">{getErrorMessage(itinerary.error)}</p>
          <Button variant="outline" className="mt-4" onClick={() => itinerary.refetch()}>
            <RotateCw />
            Thử lại
          </Button>
        </div>
        )
  }

        const data = itinerary.data
        if (data.days.length === 0) {
    return (
          <div className="rounded-3xl border-2 border-dashed border-rose-200 bg-card/60 px-6 py-12 text-center shadow-clay-card">
            <CalendarCheck className="mx-auto size-12 text-rose-400" />
            <h2 className="mt-4 text-lg font-bold">Chưa có ngày đi</h2>
            <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
              Chốt ngày ở tab <b>Lịch rảnh</b> để bắt đầu lên lịch trình cho từng ngày nhé.
            </p>
          </div>
          )
  }

  const day = data.days.find((d) => d.id === selectedId) ?? data.days[0]
  const otherDays = data.days.filter((d) => d.id !== day.id)
          const label = dayLabel(day)
  const onError = (error: unknown) => toast.error(getErrorMessage(error))

  const handleDragStart = (event: DragStartEvent) => {
    const id = parseItemDndId(event.active.id)
    setActiveItem(day.items.find((i) => i.id === id) ?? null)
  }

          const handleDragEnd = ({active, over}: DragEndEvent) => {
            setActiveItem(null)
    const itemId = parseItemDndId(active.id)
          if (!over || itemId === null) return

          const targetDayId = parseDayDndId(over.id)
          if (targetDayId !== null) {
      if (targetDayId === day.id) return
      const target = data.days.find((d) => d.id === targetDayId)
          moveItem.mutate(
          {itemId, dayId: targetDayId },
          {
            onSuccess: () =>
          toast.success(`Đã chuyển sang ${target ? dayLabel(target) : 'ngày khác'}`, {
            action: {label: 'Xem', onClick: () => setSelectedId(targetDayId) },
            }),
          onError,
        },
          )
          return
    }

          const overItemId = parseItemDndId(over.id)
          if (overItemId === null || overItemId === itemId) return
    const ids = day.items.map((i) => i.id)
          const next = arrayMove(ids, ids.indexOf(itemId), ids.indexOf(overItemId))
          reorder.mutate({dayId: day.id, itemIds: next }, {onError})
  }

  const submitItem = async (body: ItineraryItemRequest) => {
    if (itemDialog?.item) {
            await updateItem.mutateAsync({ itemId: itemDialog.item.id, body })
      toast.success('Đã lưu hoạt động')
    } else {
            await addItem.mutateAsync({ dayId: day.id, body })
      toast.success('Đã thêm vào lịch trình')
    }
          setItemDialog(null)
  }

          return (
          <div className="grid gap-4">
            <DndContext
              sensors={sensors}
              collisionDetection={collisionDetection}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDragCancel={() => setActiveItem(null)}
            >
                <div className="sticky top-16 z-20 -mx-4 bg-background/85 px-4 py-2.5 backdrop-blur-md sm:mx-0 sm:rounded-full sm:px-3 sm:border-2 sm:border-white/70 sm:shadow-clay-card">
                  <DayPills days={data.days} selectedId={day.id} onSelect={setSelectedId} dragging={activeItem !== null} />
                </div>

                {day.overflow && (
                    <div className="flex items-start justify-between gap-3 rounded-[24px] border-2 border-amber-300 bg-amber-50/90 p-4 text-sm text-amber-950 shadow-clay-card">
                      <p>
                        Ngày này nằm ngoài số ngày đã chốt. Kéo các hoạt động sang ngày khác (thả lên viên ngày phía trên), hoặc xóa
                        ngày này nếu không cần nữa.
                      </p>
                      {canEdit && (
                        <Button variant="destructive" size="sm" onClick={() => setDeleteDayOpen(true)}>
                          <Trash2 />
                          Xóa ngày
                        </Button>
                      )}
                    </div>
        )}

                    <DressCodeCard day={day} canEdit={canEdit} onEdit={() => setDressOpen(true)} />

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-foreground text-lg">{label}</h3>
                          {day.timeOrderBroken && (
                              <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-100/90 px-2.5 py-0.5 text-xs font-semibold text-amber-900 shadow-clay-badge">
                                <TriangleAlert className="size-3 text-amber-600" />
                                Giờ chưa theo thứ tự
                              </span>
            )}
                            </div>
          {canEdit && (
                            <Button size="sm" onClick={() => setItemDialog({})}>
                              <Plus />
                              Thêm hoạt động
                            </Button>
                          )}
                        </div>

                        {day.items.length === 0 ? (
          <p className="rounded-[28px] border-2 border-dashed border-border/80 bg-card/60 px-4 py-10 text-center text-sm font-medium text-muted-foreground shadow-clay-card">
            {canEdit ? 'Ngày này chưa có hoạt động nào. Thêm hoạt động đầu tiên nhé!' : 'Ngày này chưa có hoạt động nào.'}
          </p>
        ) : (
          <SortableContext items={day.items.map((i) => itemDndId(i.id))} strategy={verticalListSortingStrategy}>
            <ol className="grid gap-2.5">
              {day.items.map((item) => (
                <ItemCard
                  key={item.id}
                  item={item}
                  canEdit={canEdit}
                  otherDays={otherDays}
                  onEdit={() => setItemDialog({ item })}
                  onDelete={() => setToDelete(item)}
                  onMove={(dayId) => {
                    const target = data.days.find((d) => d.id === dayId)
                    moveItem.mutate(
                      { itemId: item.id, dayId },
                      {
                        onSuccess: () => toast.success(`Đã chuyển sang ${target ? dayLabel(target) : 'ngày khác'}`),
                        onError,
                      },
                    )
                  }}
                />
              ))}
            </ol>
          </SortableContext>
        )}

        <DragOverlay>{activeItem ? <ItemCardBody item={activeItem} floating /> : null}</DragOverlay>
      </DndContext>

      <div className="flex flex-wrap justify-between items-center gap-2 rounded-[24px] border-2 border-emerald-200/80 bg-gradient-to-r from-emerald-50/90 via-teal-50/90 to-sky-50/90 px-5 py-3.5 text-sm font-semibold text-emerald-950 shadow-clay-card">
        <span>
          Chi phí ngày này: <b className="font-bold text-emerald-700">{formatVnd(day.totalCost)}</b>
        </span>
        <span>
          Cả chuyến: <b className="font-bold text-emerald-700">{formatVnd(data.totalCost)}</b> / người
        </span>
      </div>

      <ItemFormDialog
        open={itemDialog !== null}
        onOpenChange={(open) => !open && setItemDialog(null)}
        item={itemDialog?.item}
        dayLabel={label}
        pending={addItem.isPending || updateItem.isPending}
        onSubmit={submitItem}
      />
      <DressCodeDialog
        open={dressOpen}
        onOpenChange={setDressOpen}
        day={day}
        dayLabel={label}
        pending={updateDay.isPending}
        onSubmit={async (body) => {
          await updateDay.mutateAsync({ dayId: day.id, body })
          setDressOpen(false)
          toast.success('Đã lưu dress code')
        }}
      />
      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(open) => !open && setToDelete(null)}
        title="Xóa hoạt động này?"
        description={toDelete ? `"${toDelete.title}" sẽ bị xóa khỏi lịch trình.` : ''}
        confirmLabel="Xóa"
        destructive
        pending={deleteItem.isPending}
        onConfirm={() =>
          toDelete &&
          deleteItem.mutate(toDelete.id, {
            onSuccess: () => {
              setToDelete(null)
              toast.success('Đã xóa hoạt động')
            },
            onError,
          })
        }
      />
      <ConfirmDialog
        open={deleteDayOpen}
        onOpenChange={setDeleteDayOpen}
        title={`Xóa ${label}?`}
        description={`Ngày này và ${day.items.length} hoạt động bên trong sẽ bị xóa vĩnh viễn.`}
        confirmLabel="Xóa ngày"
        destructive
        pending={deleteOverflowDay.isPending}
        onConfirm={() =>
          deleteOverflowDay.mutate(day.id, {
            onSuccess: () => {
              setDeleteDayOpen(false)
              setSelectedId(null)
              toast.success('Đã xóa ngày')
            },
            onError,
          })
        }
      />
    </div>
                        )
}
