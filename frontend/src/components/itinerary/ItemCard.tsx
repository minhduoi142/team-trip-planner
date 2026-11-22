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
      className={cn('relative', isDragging && 'z-10 opacity-40')}
    >
      <ItemCardBody item={item}>
        {canEdit && (
          <div className="flex shrink-0 items-start gap-0.5">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm" aria-label={`Tùy chọn ${item.title}`}>
                  <MoreVertical />
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
              className="flex h-8 w-7 cursor-grab touch-none items-center justify-center rounded-lg text-muted-foreground hover:bg-muted active:cursor-grabbing"
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
        'flex gap-3 rounded-2xl bg-card p-3 ring-1 ring-border',
        floating && 'rotate-1 shadow-xl ring-2 ring-primary/50',
      )}
    >
      <div className="w-12 shrink-0 pt-0.5 text-right">
        {item.startTime ? (
          <>
            <p className="text-sm font-bold">{item.startTime}</p>
            {item.endTime && <p className="text-xs text-muted-foreground">{item.endTime}</p>}
          </>
        ) : (
          <p className="text-xs text-muted-foreground">Tự do</p>
        )}
      </div>
      <span className={cn('mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl', category.tone)}>
        <category.icon className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-medium leading-snug">{item.title}</p>
        {item.locationName &&
          (href ? (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="mt-0.5 inline-flex max-w-full items-center gap-1 text-sm text-primary hover:underline"
            >
              <MapPin className="size-3.5 shrink-0" />
              <span className="truncate">{item.locationName}</span>
            </a>
          ) : (
            <p className="mt-0.5 text-sm text-muted-foreground">{item.locationName}</p>
          ))}
        {item.note && <p className="mt-1 text-sm text-muted-foreground">📝 {item.note}</p>}
        {item.estimatedCost != null && item.estimatedCost > 0 && (
          <p className="mt-1 text-xs font-medium text-emerald-700">~ {formatVnd(item.estimatedCost)}</p>
        )}
      </div>
      {children}
    </div>
  )
}
