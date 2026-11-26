import { useDroppable } from '@dnd-kit/core'
import { ChevronDown } from 'lucide-react'
import { Tabs as TabsPrimitive } from 'radix-ui'
import { useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { formatShortDate, weekdayShort } from '@/lib/date'
import { cn } from '@/lib/utils'
import type { ItineraryDayResponse } from '@/types/itinerary'
import type { DayWeatherResponse } from '@/types/weather'
import { dayLabel } from './dayLabel'
import { dayDndId } from './dndIds'
import { WeatherIcon } from './WeatherIcon'

/** Từ số ngày này trở lên thì có thêm nút mở danh sách ngày (docs/ui-slop-audit.md P3-LT-08) */
const DAY_MENU_MIN = 11

interface DayPillsProps {
  days: ItineraryDayResponse[]
  selectedId: number
  onSelect: (dayId: number) => void
  /** Đang kéo 1 hoạt động: các ngày KHÁC ngày hiện tại thành vùng thả */
  dragging: boolean
  /** Thời tiết theo dayId (có dự báo thì hiện icon + nhiệt độ cao nhất thay chấm tròn) */
  weatherByDay?: ReadonlyMap<number, DayWeatherResponse>
}

/**
 * Thanh chọn ngày. Phải nằm trong `<Tabs value={String(dayId)}>` của ItineraryTab: Radix Tabs lo phím mũi tên,
 * roving tabindex và `aria-controls` (P3-LT-09). Mỗi viên đồng thời là vùng thả của dnd-kit.
 */
export function DayPills({ days, selectedId, onSelect, dragging, weatherByDay }: DayPillsProps) {
  const listRef = useRef<HTMLDivElement>(null)

  // Đưa viên ngày đang chọn vào giữa khi đổi ngày (kể cả từ toast "Xem" hay menu ngày)
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>('[data-state="active"]')
    el?.scrollIntoView({ inline: 'center', block: 'nearest' })
  }, [selectedId])

  return (
    <div className="flex items-center gap-2">
      <div className="scroll-fade-x no-scrollbar -mx-4 min-w-0 flex-1 overflow-x-auto px-4 py-2 sm:mx-0 sm:px-1">
        <TabsPrimitive.List ref={listRef} aria-label="Chọn ngày" className="flex gap-2">
          {days.map((day) => (
            <DayPill
              key={day.id}
              day={day}
              selected={day.id === selectedId}
              droppable={dragging && day.id !== selectedId}
              weather={weatherByDay?.get(day.id)}
            />
          ))}
        </TabsPrimitive.List>
      </div>

      {days.length >= DAY_MENU_MIN && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="shrink-0" aria-label="Chọn ngày từ danh sách">
              Ngày
              <ChevronDown />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="max-h-80 overflow-y-auto">
            <DropdownMenuRadioGroup value={String(selectedId)} onValueChange={(value) => onSelect(Number(value))}>
              {days.map((day) => (
                <DropdownMenuRadioItem key={day.id} value={String(day.id)}>
                  {dayLabel(day)}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  )
}

function DayPill({
  day,
  selected,
  droppable,
  weather,
}: {
  day: ItineraryDayResponse
  selected: boolean
  droppable: boolean
  weather?: DayWeatherResponse
}) {
  const forecast = weather?.status === 'FORECAST' ? weather.forecast : null
  const { setNodeRef, isOver } = useDroppable({ id: dayDndId(day.id), disabled: !droppable })
  const strong = selected || isOver
  return (
    <TabsPrimitive.Trigger
      ref={setNodeRef}
      value={String(day.id)}
      className={cn(
        'min-w-20 shrink-0 rounded-item border px-3.5 py-2 text-left transition-colors duration-150 outline-none focus-visible:ring-3 focus-visible:ring-ring',
        selected
          ? 'border-transparent bg-primary-strong text-primary-strong-foreground shadow-flat'
          : 'border-border bg-card text-foreground hover:bg-muted/60',
        day.overflow && !selected && 'border-dashed border-warning/60 bg-warning-soft text-warning-soft-foreground',
        droppable && 'border-dashed border-primary bg-primary/5',
        isOver && 'border-transparent bg-primary-strong text-primary-strong-foreground',
      )}
    >
      <span className="flex items-center justify-between gap-1.5">
        <span className="text-xs font-bold">Ngày {day.dayIndex}</span>
        {forecast && (
          <span className="inline-flex items-center gap-0.5 text-xs font-semibold tabular-nums">
            <WeatherIcon condition={forecast.condition} className="size-3.5" colored={!strong} />
            {forecast.tempMax != null && `${Math.round(forecast.tempMax)}°`}
            <span className="sr-only">{`, ${forecast.label}`}</span>
          </span>
        )}
      </span>
      <span className={cn('mt-0.5 block truncate text-xs', strong ? 'opacity-90' : 'text-muted-foreground')}>
        {day.overflow ? 'Chưa xếp' : day.date ? `${weekdayShort(day.date)} ${formatShortDate(day.date)}` : '—'}
      </span>
      <span className={cn('mt-0.5 block truncate text-xs', strong ? 'opacity-90' : 'text-muted-foreground')}>
        {droppable ? 'Thả vào đây' : `${day.items.length} hoạt động`}
      </span>
    </TabsPrimitive.Trigger>
  )
}
