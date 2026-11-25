import { CloudOff, Droplets, MapPin, Sun, Wind } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatShortDate } from '@/lib/date'
import type { IsoInstant } from '@/types/api'
import type { DayWeatherResponse } from '@/types/weather'
import { WeatherIcon } from './WeatherIcon'

/** Ngưỡng hiện thêm gió / UV (docs/sdd-weather.md §5.7) */
const WIND_NOTICE_KMH = 40
const UV_NOTICE = 8
const RAIN_SUM_NOTICE_MM = 1

const round = (n: number) => Math.round(n)

function fetchedTime(fetchedAt: IsoInstant | null): string | null {
  if (!fetchedAt) return null
  return new Date(fetchedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
}

interface DayWeatherCardProps {
  weather: DayWeatherResponse | undefined
  fetchedAt: IsoInstant | null
  canEdit: boolean
  /** Mở form sửa chuyến để chọn vị trí điểm đến */
  onEditTrip?: () => void
}

/** Thời tiết đầu mỗi ngày trong tab Lịch trình. PAST / NO_DATE / đang tải lần đầu → không hiện gì. */
export function DayWeatherCard({ weather, fetchedAt, canEdit, onEditTrip }: DayWeatherCardProps) {
  if (!weather) return null

  switch (weather.status) {
    case 'FORECAST': {
      const f = weather.forecast
      if (!f) return null
      const time = fetchedTime(fetchedAt)
      return (
        <section
          aria-label="Dự báo thời tiết"
          className="flex min-h-24 items-center gap-4 rounded-[28px] border-2 border-white/80 bg-gradient-to-br from-sky-50/95 via-card/95 to-amber-50/90 p-4 shadow-clay-card"
        >
          <div className="grid size-14 shrink-0 place-items-center rounded-2xl bg-white/80 shadow-clay-badge">
            <WeatherIcon condition={f.condition} className="size-8" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
              <p className="font-bold text-foreground">{f.label}</p>
              {f.tempMin != null && f.tempMax != null && (
                <p className="text-lg font-extrabold tabular-nums text-foreground">
                  {round(f.tempMin)}–{round(f.tempMax)}°C
                </p>
              )}
            </div>
            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs font-medium text-muted-foreground">
              {f.precipProbability != null && (
                <span className="inline-flex items-center gap-1">
                  <Droplets className="size-3.5 text-sky-500" />
                  Mưa {f.precipProbability}%
                  {f.precipSum != null && f.precipSum >= RAIN_SUM_NOTICE_MM && ` · ${f.precipSum.toFixed(1)} mm`}
                </span>
              )}
              {f.windMax != null && f.windMax >= WIND_NOTICE_KMH && (
                <span className="inline-flex items-center gap-1 text-amber-700">
                  <Wind className="size-3.5" />
                  Gió mạnh {round(f.windMax)} km/h
                </span>
              )}
              {f.uvMax != null && f.uvMax >= UV_NOTICE && (
                <span className="inline-flex items-center gap-1 text-orange-700">
                  <Sun className="size-3.5" />
                  UV {round(f.uvMax)} (rất cao)
                </span>
              )}
              {weather.placeName && (
                <span className="inline-flex min-w-0 items-center gap-1">
                  <MapPin className="size-3.5 shrink-0" />
                  <span className="truncate">{weather.placeName}</span>
                </span>
              )}
            </div>
            <p className="mt-1.5 text-[11px] text-muted-foreground/80">
              {time && `Cập nhật ${time} · `}
              Dữ liệu thời tiết:{' '}
              <a href="https://open-meteo.com/" target="_blank" rel="noreferrer" className="underline underline-offset-2">
                Open-Meteo.com
              </a>
            </p>
          </div>
        </section>
      )
    }
    case 'TOO_FAR':
      return weather.availableFrom ? (
        <p className="flex items-center gap-2 px-1 text-sm text-muted-foreground">
          <WeatherIcon condition="PARTLY_CLOUDY" className="size-4" />
          Dự báo thời tiết có từ {formatShortDate(weather.availableFrom)}
        </p>
      ) : null
    case 'NO_LOCATION':
      return canEdit && onEditTrip ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-[24px] border-2 border-dashed border-sky-200 bg-sky-50/70 px-4 py-3 text-sm shadow-clay-card">
          <p className="text-sky-900">Gắn vị trí điểm đến để xem dự báo thời tiết từng ngày.</p>
          <Button size="sm" variant="outline" onClick={onEditTrip}>
            <MapPin />
            Chọn vị trí
          </Button>
        </div>
      ) : null
    case 'UNAVAILABLE':
      return (
        <p className="flex items-center gap-2 px-1 text-sm text-muted-foreground">
          <CloudOff className="size-4" />
          Chưa lấy được dự báo thời tiết, thử lại sau nhé.
        </p>
      )
    default:
      return null
  }
}
