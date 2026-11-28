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
  type Announcements,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
  type ScreenReaderInstructions,
  type UniqueIdentifier,
} from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable'
import dayjs from 'dayjs'
import { CalendarCheck, ListPlus, Plus, Trash2, TriangleAlert } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { EmptyState, TabErrorState } from '@/components/common/states'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent } from '@/components/ui/tabs'
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
import { useTripWeather } from '@/hooks/useWeather'
import { getErrorMessage } from '@/lib/api'
import { formatVnd } from '@/lib/tripContent'
import type { IsoDate } from '@/types/api'
import type { ItineraryItemRequest, ItineraryItemResponse } from '@/types/itinerary'
import { DayPills } from './DayPills'
import { goldenSlot } from '@/lib/sunTimes'
import { DayWeatherCard } from './DayWeatherCard'
import { DressCodeCard } from './DressCodeCard'
import { DayDocuments } from '@/components/documents/DayDocuments'
import { DayOutfits } from '@/components/outfits/DayOutfits'
import { DressCodeDialog } from './DressCodeDialog'
import { SunTimesRow } from './SunTimesRow'
import { ItemCard, ItemCardBody } from './ItemCard'
import { ItemFormDialog } from './ItemFormDialog'
import { dayLabel } from './dayLabel'
import { itemDndId, parseDayDndId, parseItemDndId } from './dndIds'

/** Ưu tiên vùng thả là viên ngày dưới con trỏ; ngoài ra sắp xếp trong danh sách theo item gần nhất. */
const collisionDetection: CollisionDetection = (args) => {
  const pill = pointerWithin(args).find((c) => parseDayDndId(c.id) !== null)
  return pill ? [pill] : closestCenter(args)
}

/** Open-Meteo dự báo 16 ngày (hôm nay + 15): chỉ những ngày này mới giữ chỗ skeleton khi đang tải thời tiết */
const FORECAST_DAYS_AHEAD = 15

function inForecastRange(date: IsoDate | null): boolean {
  if (!date) return false
  const diff = dayjs(date).startOf('day').diff(dayjs().startOf('day'), 'day')
  return diff >= 0 && diff <= FORECAST_DAYS_AHEAD
}

const screenReaderInstructions: ScreenReaderInstructions = {
  draggable:
    'Để sắp xếp, nhấn Space hoặc Enter để nhấc hoạt động, dùng phím mũi tên lên xuống để di chuyển, ' +
    'nhấn Space hoặc Enter lần nữa để thả, hoặc Esc để hủy.',
}

interface ItineraryTabProps {
  tripId: number
  canEdit: boolean
  /** Mở form sửa chuyến (gắn vị trí điểm đến để có thời tiết) */
  onEditTrip?: () => void
  /** Số thành viên, cho dòng "Outfit của nhóm · 3/6 người" */
  memberCount: number
}

export function ItineraryTab({ tripId, canEdit, onEditTrip, memberCount }: ItineraryTabProps) {
  const itinerary = useItinerary(tripId)
  // Chỉ hỏi thời tiết khi đã chốt ngày (có ngày thật)
  const weather = useTripWeather(tripId, itinerary.data?.days.some((d) => d.date !== null) ?? false)
  const weatherByDay = useMemo(
    () => new Map((weather.data?.days ?? []).map((w) => [w.dayId, w] as const)),
    [weather.data],
  )
  const addItem = useAddItem(tripId)
  const updateItem = useUpdateItem(tripId)
  const deleteItem = useDeleteItem(tripId)
  const moveItem = useMoveItem(tripId)
  const reorder = useReorderItems(tripId)
  const updateDay = useUpdateDay(tripId)
  const deleteOverflowDay = useDeleteOverflowDay(tripId)

  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [itemDialog, setItemDialog] = useState<{ item?: ItineraryItemResponse } | null>(null)
  /** Hộp thoại thông tin ngày; 'place' = mở từ phần thời tiết, focus vào ô địa điểm */
  const [dayDialog, setDayDialog] = useState<'info' | 'place' | null>(null)
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
      <div className="grid gap-4" aria-busy="true" aria-label="Đang tải lịch trình">
        <div className="flex gap-2 overflow-hidden py-2">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-17 w-24 shrink-0 rounded-item" />
          ))}
        </div>
        <Skeleton className="h-24 rounded-surface" />
        <Skeleton className="h-20 rounded-surface" />
        <Skeleton className="h-20 rounded-surface" />
      </div>
    )
  }
  if (itinerary.isError) {
    return <TabErrorState error={itinerary.error} onRetry={() => itinerary.refetch()} />
  }

  const data = itinerary.data
  if (data.days.length === 0) {
    return (
      <EmptyState
        icon={CalendarCheck}
        title="Chưa có ngày đi"
        description={
          <>
            Chốt ngày ở tab <b>Lịch rảnh</b> để bắt đầu lên lịch trình cho từng ngày nhé.
          </>
        }
      />
    )
  }

  const day = data.days.find((d) => d.id === selectedId) ?? data.days[0]
  const otherDays = data.days.filter((d) => d.id !== day.id)
  const label = dayLabel(day)
  const onError = (error: unknown) => toast.error(getErrorMessage(error))

  // Thông báo kéo thả bằng tiếng Việt, dùng tên hoạt động thay cho id kỹ thuật (P3-LT-19)
  const itemTitle = (id: UniqueIdentifier) => {
    const itemId = parseItemDndId(id)
    return `"${day.items.find((i) => i.id === itemId)?.title ?? 'hoạt động'}"`
  }
  const overLabel = (id: UniqueIdentifier) => {
    const dayId = parseDayDndId(id)
    if (dayId !== null) {
      const target = data.days.find((d) => d.id === dayId)
      return target ? dayLabel(target) : 'ngày khác'
    }
    const index = day.items.findIndex((i) => i.id === parseItemDndId(id))
    return index >= 0 ? `vị trí ${index + 1} trên ${day.items.length}` : 'danh sách'
  }
  const announcements: Announcements = {
    onDragStart: ({ active }) => `Đã nhấc ${itemTitle(active.id)}.`,
    onDragOver: ({ active, over }) =>
      over ? `${itemTitle(active.id)} đang ở ${overLabel(over.id)}.` : `${itemTitle(active.id)} không ở vùng thả nào.`,
    onDragEnd: ({ active, over }) =>
      over ? `Đã thả ${itemTitle(active.id)} vào ${overLabel(over.id)}.` : `Đã thả ${itemTitle(active.id)}.`,
    onDragCancel: ({ active }) => `Đã hủy kéo ${itemTitle(active.id)}.`,
  }

  const handleDragStart = (event: DragStartEvent) => {
    const id = parseItemDndId(event.active.id)
    setActiveItem(day.items.find((i) => i.id === id) ?? null)
  }

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveItem(null)
    const itemId = parseItemDndId(active.id)
    if (!over || itemId === null) return

    const targetDayId = parseDayDndId(over.id)
    if (targetDayId !== null) {
      if (targetDayId === day.id) return
      const target = data.days.find((d) => d.id === targetDayId)
      moveItem.mutate(
        { itemId, dayId: targetDayId },
        {
          onSuccess: () =>
            toast.success(`Đã chuyển sang ${target ? dayLabel(target) : 'ngày khác'}`, {
              action: { label: 'Xem', onClick: () => setSelectedId(targetDayId) },
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
    reorder.mutate({ dayId: day.id, itemIds: next }, { onError })
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
        accessibility={{ announcements, screenReaderInstructions }}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveItem(null)}
      >
        {/* Radix Tabs: phím mũi tên giữa các viên ngày, aria-controls trỏ tới nội dung ngày (P3-LT-09) */}
        <Tabs value={String(day.id)} onValueChange={(value) => setSelectedId(Number(value))} className="gap-2">
          <DayPills
            days={data.days}
            selectedId={day.id}
            onSelect={setSelectedId}
            dragging={activeItem !== null}
            weatherByDay={weatherByDay}
          />

          <TabsContent value={String(day.id)} className="grid gap-4">
            {day.overflow && (
              <div
                role="note"
                className="flex flex-wrap items-start justify-between gap-3 rounded-surface border border-warning/40 bg-warning-soft p-4 text-sm text-warning-soft-foreground"
              >
                <p className="flex min-w-0 flex-1 items-start gap-2">
                  <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
                  <span>
                    Ngày này nằm ngoài số ngày đã chốt. Kéo các hoạt động sang ngày khác (thả lên viên ngày phía trên),
                    hoặc xóa ngày này nếu không cần nữa.
                  </span>
                </p>
                {canEdit && (
                  <Button variant="destructive" size="sm" onClick={() => setDeleteDayOpen(true)}>
                    <Trash2 />
                    Xóa ngày
                  </Button>
                )}
              </div>
            )}

            {/* Dải tóm tắt của ngày: thời tiết + dress code chung một khối nền card (P3-LT-10); rỗng thì ẩn */}
            <div className="divide-y divide-border overflow-hidden rounded-surface border border-border bg-card shadow-flat empty:hidden">
              <DayWeatherCard
                tripId={tripId}
                weather={weatherByDay.get(day.id)}
                fetchedAt={weather.data?.fetchedAt ?? null}
                loading={weather.isLoading && inForecastRange(day.date)}
                canEdit={canEdit}
                ownPlace={day.place !== null}
                onEditTrip={onEditTrip}
                onEditDayPlace={() => setDayDialog('place')}
              />
              <SunTimesRow sun={weatherByDay.get(day.id)?.sun} date={day.date} />
              <DayDocuments tripId={tripId} date={day.date} />
              <DressCodeCard day={day} canEdit={canEdit} onEdit={() => setDayDialog('info')} />
              <DayOutfits tripId={tripId} day={day} days={data.days} memberCount={memberCount} />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <h3 className="text-lg font-bold text-foreground">{label}</h3>
                {day.timeOrderBroken && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-warning-soft px-2.5 py-0.5 text-xs font-semibold text-warning-soft-foreground">
                    <TriangleAlert className="size-3.5 text-warning" aria-hidden="true" />
                    Giờ chưa theo thứ tự
                  </span>
                )}
              </div>
              {canEdit && day.items.length > 0 && (
                <Button size="sm" onClick={() => setItemDialog({})}>
                  <Plus />
                  Thêm hoạt động
                </Button>
              )}
            </div>

            {day.items.length === 0 ? (
              <EmptyState
                icon={ListPlus}
                title="Ngày này chưa có hoạt động nào"
                description={canEdit ? 'Hoạt động có giờ sẽ tự xếp đúng thứ tự trong ngày.' : undefined}
                action={
                  canEdit && (
                    <Button onClick={() => setItemDialog({})}>
                      <Plus />
                      Thêm hoạt động
                    </Button>
                  )
                }
              />
            ) : (
              <SortableContext items={day.items.map((i) => itemDndId(i.id))} strategy={verticalListSortingStrategy}>
                <ol className="grid gap-2.5" aria-label={`Hoạt động của ${label}`}>
                  {day.items.map((item) => (
                    <ItemCard
                      key={item.id}
                      item={item}
                      canEdit={canEdit}
                      otherDays={otherDays}
                      onEdit={() => setItemDialog({ item })}
                      onDelete={() => setToDelete(item)}
                      golden={goldenSlot(weatherByDay.get(day.id)?.sun, item.startTime)}
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

            <p className="flex flex-wrap justify-between gap-x-4 gap-y-1 px-1 text-sm text-muted-foreground">
              <span>
                Chi phí ngày này:{' '}
                <b className="font-semibold text-foreground tabular-nums">{formatVnd(day.totalCost)}</b>
              </span>
              <span>
                Cả chuyến: <b className="font-semibold text-foreground tabular-nums">{formatVnd(data.totalCost)}</b> /
                người
              </span>
            </p>
          </TabsContent>
        </Tabs>

        <DragOverlay>{activeItem ? <ItemCardBody item={activeItem} floating /> : null}</DragOverlay>
      </DndContext>

      <ItemFormDialog
        open={itemDialog !== null}
        onOpenChange={(open) => !open && setItemDialog(null)}
        item={itemDialog?.item}
        dayLabel={label}
        sun={weatherByDay.get(day.id)?.sun}
        pending={addItem.isPending || updateItem.isPending}
        onSubmit={submitItem}
      />
      <DressCodeDialog
        open={dayDialog !== null}
        onOpenChange={(open) => !open && setDayDialog(null)}
        focus={dayDialog === 'place' ? 'place' : undefined}
        day={day}
        dayLabel={label}
        pending={updateDay.isPending}
        onSubmit={async (body) => {
          await updateDay.mutateAsync({ dayId: day.id, body })
          setDayDialog(null)
          toast.success('Đã lưu')
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
