import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { ReactNode } from 'react'
import { ArrowRightLeft, Camera, GripVertical, MapPin, Pencil, StickyNote, Trash2 } from 'lucide-react'
import { RowMenuButton } from '@/components/common/layout'
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
import type { GoldenSlot } from '@/lib/sunTimes'
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
  /** Giờ bắt đầu rơi vào giờ vàng (docs/sdd-golden-hour-outfit.md A.5) */
  golden?: GoldenSlot | null
}

/** Thẻ hoạt động kéo thả được (dnd-kit sortable). Kéo bằng tay nắm ⋮⋮ để không cản cuộn trang. */
export function ItemCard({ item, canEdit, otherDays, onEdit, onDelete, onMove, golden }: ItemCardProps) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: itemDndId(item.id),
    disabled: !canEdit,
  })

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'relative rounded-surface',
        isDragging && 'z-20 opacity-40 outline-2 outline-dashed outline-primary',
      )}
    >
      <ItemCardBody item={item} golden={golden}>
        {canEdit && (
          <div className="flex shrink-0 items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <RowMenuButton label={`Tùy chọn cho ${item.title}`} />
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
              className="flex min-h-11 w-9 cursor-grab touch-none items-center justify-center rounded-control text-muted-foreground transition-colors outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring active:cursor-grabbing"
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
  golden = null,
}: {
  item: ItineraryItemResponse
  children?: ReactNode
  floating?: boolean
  golden?: GoldenSlot | null
}) {
  const category = itineraryCategory(item.category)
  const href = mapsHref(item.mapsUrl, item.locationName)
  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-surface border border-border bg-card p-3.5 transition-shadow sm:p-4',
        floating ? 'rotate-1 cursor-grabbing border-primary/40 shadow-overlay' : 'shadow-flat',
      )}
    >
      <div className="min-w-14 shrink-0 rounded-control bg-muted/60 px-2 py-1.5 text-center">
        {item.startTime ? (
          <>
            <p className="text-xs leading-tight font-bold text-foreground tabular-nums">{item.startTime}</p>
            {item.endTime && (
              <p className="mt-0.5 text-xs leading-tight text-muted-foreground tabular-nums">{item.endTime}</p>
            )}
          </>
        ) : (
          <p className="text-xs font-medium text-muted-foreground">Tự do</p>
        )}
      </div>

      <span
        className={cn('mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-control', category.tone)}
        title={category.label}
      >
        <category.icon className="size-4.5" aria-hidden="true" />
        <span className="sr-only">{category.label}</span>
      </span>

      <div className="min-w-0 flex-1">
        <p className="leading-snug font-bold break-words text-foreground">{item.title}</p>
        {golden && (
          <p className="mt-1 inline-flex items-center gap-1 rounded-full bg-warning-soft px-2 py-0.5 text-2xs font-semibold whitespace-nowrap text-warning-soft-foreground">
            <Camera className="size-3" aria-hidden="true" />
            Giờ vàng {golden === 'morning' ? 'sáng' : 'chiều'}
          </p>
        )}
        {item.locationName &&
          (href ? (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="mt-0.5 inline-flex max-w-full items-center gap-1 rounded-sm text-xs font-semibold text-primary-strong outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring"
            >
              <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
              <span className="truncate">{item.locationName}</span>
            </a>
          ) : (
            <p className="mt-0.5 text-xs break-words text-muted-foreground">{item.locationName}</p>
          ))}
        {item.note && (
          <p className="mt-1.5 flex items-start gap-1.5 text-xs text-muted-foreground">
            <StickyNote className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
            <span className="min-w-0 whitespace-pre-line break-words">{item.note}</span>
          </p>
        )}
        {item.estimatedCost != null && item.estimatedCost > 0 && (
          <p className="mt-1.5 text-xs font-semibold text-money-out tabular-nums">~ {formatVnd(item.estimatedCost)}</p>
        )}
      </div>

      {children}
    </div>
  )
}
