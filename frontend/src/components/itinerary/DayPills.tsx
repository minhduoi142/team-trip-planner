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
        <div className="-mx-4 overflow-x-auto px-4 pb-1.5 sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <div className="flex gap-2.5 py-0.5" role="tablist" aria-label="Chọn ngày">
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
  const {setNodeRef, isOver} = useDroppable({id: dayDndId(day.id), disabled: !droppable })
        return (
        <button
          ref={setNodeRef}
          type="button"
          role="tab"
          aria-selected={selected}
          onClick={onSelect}
          className={cn(
            'group relative min-w-24 shrink-0 rounded-full px-4 py-2.5 text-left transition-all duration-300',
            'border-2 active:scale-95',
            selected
              ? 'bg-gradient-to-r from-rose-500 to-rose-600 text-white border-rose-300 shadow-clay-btn-primary -translate-y-0.5 font-bold scale-102'
              : 'bg-card/95 text-foreground border-white/70 shadow-clay-card hover:-translate-y-0.5 hover:shadow-clay-card-hover',
            day.overflow && !selected && 'border-dashed border-amber-300 bg-amber-50/80 text-amber-900',
            droppable && 'ring-2 ring-rose-400 ring-offset-2 animate-pulse border-dashed border-rose-400 bg-rose-50/60 shadow-clay-sunken',
            isOver && 'scale-110 bg-primary text-primary-foreground ring-4 ring-rose-300 shadow-clay-btn-primary',
          )}
        >
            <div className="flex items-center justify-between gap-1">
              <p className="text-xs font-bold tracking-wide">Ngày {day.dayIndex}</p>
              <span
                className={cn(
                  'inline-block size-1.5 rounded-full',
                  selected || isOver ? 'bg-white' : 'bg-primary/60',
                )}
              />
            </div>
            <p className={cn('text-xs mt-0.5 truncate', selected || isOver ? 'text-white/90' : 'text-muted-foreground')}>
              {day.overflow ? 'Chưa xếp' : day.date ? `${weekdayShort(day.date)} ${formatShortDate(day.date)}` : '—'}
            </p>
              <p className={cn('mt-0.5 text-[11px] font-medium truncate', selected || isOver ? 'text-white/80' : 'text-muted-foreground/80')}>
                {droppable ? '✨ Thả vào đây' : `${day.items.length} hoạt động`}
              </p>
            </button>
            )
}
