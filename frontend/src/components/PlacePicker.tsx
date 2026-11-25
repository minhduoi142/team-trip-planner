import { Loader2, MapPin, MapPinOff } from 'lucide-react'
import { useId, useState, type KeyboardEvent } from 'react'
import { Input } from '@/components/ui/input'
import { useGeoSearch } from '@/hooks/useWeather'
import { cn } from '@/lib/utils'
import type { GeoPlaceResponse } from '@/types/weather'

export interface PlaceLocation {
  lat: number
  lon: number
}

interface PlacePickerProps {
  id: string
  value: string
  location: PlaceLocation | null
  /** Gõ tay → location null (bỏ vị trí); chọn gợi ý → label + tọa độ */
  onChange: (value: string, location: PlaceLocation | null) => void
  placeholder?: string
  maxLength?: number
}

/**
 * Ô "Điểm đến" có gợi ý địa điểm (Open-Meteo qua /geo/search). Danh sách gợi ý nằm ngay dưới ô (không popover)
 * để không bị cắt trong dialog cuộn và dễ chạm trên điện thoại. Vẫn cho lưu chữ tự do (khi đó không có thời tiết).
 */
export function PlacePicker({ id, value, location, onChange, placeholder, maxLength = 150 }: PlacePickerProps) {
  const listId = useId()
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const search = useGeoSearch(value, open && location === null)
  const places: GeoPlaceResponse[] = search.active ? (search.data ?? []) : []
  const showList = open && search.active

  const choose = (place: GeoPlaceResponse) => {
    onChange(place.label, { lat: place.lat, lon: place.lon })
    setOpen(false)
    setActive(-1)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!showList || places.length === 0) return
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActive((i) => (i + 1) % places.length)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActive((i) => (i <= 0 ? places.length - 1 : i - 1))
    } else if (event.key === 'Enter' && active >= 0) {
      event.preventDefault()   // không submit form
      choose(places[active])
    } else if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()   // không đóng dialog
      setOpen(false)
    }
  }

  const loading = showList && (search.typing || search.isFetching) && places.length === 0

  return (
    <div className="grid gap-1.5">
      <div className="relative">
        <Input
          id={id}
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
          autoComplete="off"
          maxLength={maxLength}
          placeholder={placeholder}
          value={value}
          className={cn(location && 'pr-9')}
          onChange={(e) => {
            onChange(e.target.value, null)
            setOpen(true)
            setActive(-1)
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onKeyDown={handleKeyDown}
        />
        {location && (
          <MapPin
            className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-emerald-600"
            aria-label="Đã gắn vị trí"
          />
        )}
      </div>

      {showList && (
        <div className="rounded-2xl border-2 border-white/80 bg-card shadow-clay-card">
          {loading ? (
            <p className="flex items-center gap-2 px-3 py-2.5 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Đang tìm địa điểm…
            </p>
          ) : search.isError ? (
            <p className="px-3 py-2.5 text-sm text-muted-foreground">Không tìm được gợi ý lúc này, bạn vẫn có thể gõ tự do.</p>
          ) : places.length === 0 ? (
            !search.typing && !search.isFetching && (
              <p className="px-3 py-2.5 text-sm text-muted-foreground">Không thấy địa điểm phù hợp.</p>
            )
          ) : (
            <ul id={listId} role="listbox" aria-label="Gợi ý địa điểm" className="max-h-64 overflow-y-auto py-1">
              {places.map((place, index) => (
                <li
                  key={`${place.lat},${place.lon},${place.name}`}
                  id={`${listId}-${index}`}
                  role="option"
                  aria-selected={index === active}
                  // mousedown thay vì click: chọn trước khi ô nhập mất focus và đóng danh sách
                  onMouseDown={(e) => {
                    e.preventDefault()
                    choose(place)
                  }}
                  onMouseEnter={() => setActive(index)}
                  className={cn(
                    'flex cursor-pointer items-start gap-2 px-3 py-2 text-sm',
                    index === active && 'bg-rose-50 dark:bg-rose-950/40',
                  )}
                >
                  <MapPin className="mt-0.5 size-4 shrink-0 text-rose-500" />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate font-semibold">{place.name}</span>
                      {place.kind && (
                        <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                          {place.kind}
                        </span>
                      )}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {[place.area, place.region, place.country].filter((p) => p && p !== place.name).join(', ')}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {location ? (
        <p className="flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-400">
          <MapPin className="size-3.5" />
          Đã gắn vị trí, lịch trình sẽ có dự báo thời tiết.
        </p>
      ) : (
        value.trim() && (
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPinOff className="size-3.5" />
            Chọn từ gợi ý để xem được thời tiết cho chuyến đi.
          </p>
        )
      )}
    </div>
  )
}
