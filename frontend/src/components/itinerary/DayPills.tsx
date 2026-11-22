import { useDroppable } from '@dnd-kit/core'
import { formatShortDate, weekdayShort } from '@/lib/date'
import { cn } from '@/lib/utils'
import type { ItineraryDayResponse } from '@/types/itinerary'
import { dayDndId } from './dndIds'

interface DayPillsProps {
  days: ItineraryDayResponse[]
  selectedId: number
  onSelect: (dayId: number) => void
  /** Đang kéo 1 hoạt động: các ngày KHÁC ngày hiện tại thành vùng thả */
  dragging: boolean
}

export function DayPills({ days, selectedId, onSelect, dragging }: DayPillsProps) {
  return (
    <div className="-mx-4 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
      <div className="flex gap-2" role="tablist" aria-label="Chọn ngày">
        {days.map((day) => (
          <DayPill
            key={day.id}
            day={day}
            selected={day.id === selectedId}
            droppable={dragging && day.id !== selectedId}
            onSelect={() => onSelect(day.id)}
          />
        ))}
      </div>
    </div>
  )
}

function DayPill({
  day,
  selected,
  droppable,
  onSelect,
}: {
  day: ItineraryDayResponse
  selected: boolean
  droppable: boolean
  onSelect: () => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: dayDndId(day.id), disabled: !droppable })
  return (
    <button
      ref={setNodeRef}
      type="button"
      role="tab"
      aria-selected={selected}
      onClick={onSelect}
      className={cn(
        'min-w-20 shrink-0 rounded-2xl px-3 py-2 text-left ring-1 ring-border transition',
        selected ? 'bg-foreground text-background ring-foreground' : 'bg-card',
        day.overflow && !selected && 'border border-dashed border-amber-400 bg-amber-50',
        droppable && 'ring-2 ring-primary/40 ring-offset-1',
        isOver && 'scale-105 bg-primary text-primary-foreground ring-primary',
      )}
    >
      <p className="text-xs font-semibold">Ngày {day.dayIndex}</p>
      <p className={cn('text-xs', selected || isOver ? 'opacity-80' : 'text-muted-foreground')}>
        {day.overflow ? 'Chưa xếp' : day.date ? `${weekdayShort(day.date)} ${formatShortDate(day.date)}` : '—'}
      </p>
      <p className={cn('mt-0.5 text-[11px]', selected || isOver ? 'opacity-80' : 'text-muted-foreground')}>
        {droppable ? 'Thả vào đây' : `${day.items.length} hoạt động`}
      </p>
    </button>
  )
}
