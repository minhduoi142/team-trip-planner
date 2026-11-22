import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { ReactNode } from 'react'
import { ArrowRightLeft, GripVertical, MapPin, MoreVertical, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { formatVnd, itineraryCategory, mapsHref } from '@/lib/tripContent'
import { cn } from '@/lib/utils'
import type { ItineraryDayResponse, ItineraryItemResponse } from '@/types/itinerary'
import { dayLabel } from './dayLabel'
import { itemDndId } from './dndIds'

interface ItemCardProps {
  item: ItineraryItemResponse
  canEdit: boolean
  otherDays: ItineraryDayResponse[]
  onEdit: () => void
  onDelete: () => void
  onMove: (dayId: number) => void
}

/** Thẻ hoạt động kéo thả được (dnd-kit sortable). Kéo bằng tay nắm ⋮⋮ để không cản cuộn trang. */
export function ItemCard({ item, canEdit, otherDays, onEdit, onDelete, onMove }: ItemCardProps) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: itemDndId(item.id),
    disabled: !canEdit,
  })

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'relative transition-all duration-200',
        isDragging && 'z-20 opacity-30 scale-95 rounded-[24px] border-2 border-dashed border-rose-300 shadow-clay-sunken bg-rose-50/20',
      )}
    >
      <ItemCardBody item={item}>
        {canEdit && (
            <div className="flex shrink-0 items-center gap-1">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Tùy chọn ${item.title}`}
                      className="rounded-full border border-white/70 bg-white/60 shadow-clay-badge hover:bg-white"
                    >
                      <MoreVertical className="size-3.5" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={onEdit}>
                    <Pencil />
                    Sửa
                  </DropdownMenuItem>
                  {otherDays.length > 0 && (
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger>
                        <ArrowRightLeft />
                        Chuyển sang ngày…
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent>
                        {otherDays.map((day) => (
                          <DropdownMenuItem key={day.id} onSelect={() => onMove(day.id)}>
                            {dayLabel(day)}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" onSelect={onDelete}>
                    <Trash2 />
                    Xóa
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <button
                ref={setActivatorNodeRef}
                type="button"
                aria-label={`Kéo để sắp xếp ${item.title}`}
                className="flex h-8 w-7 cursor-grab touch-none items-center justify-center rounded-xl border border-white/70 bg-white/60 shadow-clay-badge text-muted-foreground hover:bg-muted hover:text-foreground active:cursor-grabbing active:scale-95 transition-all"
                {...attributes}
                {...listeners}
              >
                <GripVertical className="size-4" />
              </button>
            </div>
        )}
          </ItemCardBody>
    </li>
  )
}

/** Phần hiển thị, dùng chung cho thẻ trong danh sách và bản "bay" theo tay khi kéo (DragOverlay). */
export function ItemCardBody({
  item,
  children,
  floating = false,
}: {
  item: ItineraryItemResponse
  children?: ReactNode
  floating?: boolean
}) {
  const category = itineraryCategory(item.category)
  const href = mapsHref(item.mapsUrl, item.locationName)
  return (
    <div
      className={cn(
        'group flex items-start gap-3 rounded-[24px] border-2 border-white/80 bg-card/95 p-3.5 sm:p-4 shadow-clay-card transition-all duration-300',
        floating
          ? 'rotate-2 scale-105 shadow-2xl ring-2 ring-primary/40 bg-card border-2 border-primary/30 cursor-grabbing'
          : 'hover:-translate-y-0.5 hover:shadow-clay-card-hover',
      )}
    >
        <div className="min-w-14 shrink-0 rounded-2xl bg-muted/40 border border-white/60 shadow-clay-sunken py-1.5 px-2 text-center">
          {item.startTime ? (
            <>
              <p className="text-xs font-bold text-foreground leading-tight">{item.startTime}</p>
              {item.endTime && <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{item.endTime}</p>}
            </>
          ) : (
          <p className="text-[11px] font-medium text-muted-foreground">Tự do</p>
          )}
        </div>

          <span
            className={cn(
              'mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-2xl border border-white/80 shadow-clay-badge transition-transform group-hover:scale-105',
              category.tone,
            )}
          >
            <category.icon className="size-4.5" />
          </span>

          <div className="min-w-0 flex-1">
            <p className="font-bold text-foreground leading-snug">{item.title}</p>
            {item.locationName &&
              (href ? (
                <a
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-0.5 inline-flex max-w-full items-center gap-1 text-xs font-semibold text-primary hover:underline"
                >
                  <MapPin className="size-3.5 shrink-0" />
                  <span className="truncate">{item.locationName}</span>
                </a>
              ) : (
            <p className="mt-0.5 text-xs text-muted-foreground truncate">{item.locationName}</p>
              ))}
            {item.note && (
              <p className="mt-1.5 rounded-xl bg-muted/30 px-2.5 py-1 text-xs text-muted-foreground border border-white/50 shadow-clay-sunken">
                📝 {item.note}
              </p>
            )}
            {item.estimatedCost != null && item.estimatedCost > 0 && (
          <div className="mt-1.5">
            <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 shadow-clay-badge">
              ~ {formatVnd(item.estimatedCost)}
            </span>
          </div>
            )}
          </div>

          {children}
      </div>
      )
}
