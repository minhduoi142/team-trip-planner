import { CloudOff, Droplets, MapPin, Sun, Wind } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { formatShortDate } from '@/lib/date'
import type { IsoInstant } from '@/types/api'
import type { DayWeatherResponse } from '@/types/weather'
import { WeatherAdviceList } from './WeatherAdviceList'
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

/** Dòng ghi công nguồn: bắt buộc theo CC BY 4.0 của Open-Meteo, không được bỏ. */
function Attribution({ time }: { time: string | null }) {
  return (
    <p className="text-xs text-muted-foreground">
      {time && `Cập nhật ${time} · `}
      Dữ liệu thời tiết:{' '}
      <a
        href="https://open-meteo.com/"
        target="_blank"
        rel="noreferrer"
        className="rounded-sm underline underline-offset-2 outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring"
      >
        Open-Meteo.com
      </a>
    </p>
  )
}

interface DayWeatherCardProps {
  tripId: number
  weather: DayWeatherResponse | undefined
  fetchedAt: IsoInstant | null
  /** Đang tải lần đầu và ngày nằm trong khoảng có dự báo: giữ chỗ bằng skeleton để nội dung không bị đẩy xuống */
  loading?: boolean
  canEdit: boolean
  /** Ngày có vị trí riêng (khác vị trí của chuyến) → hiện tên nơi đó */
  ownPlace: boolean
  /** Mở form sửa chuyến để chọn vị trí điểm đến */
  onEditTrip?: () => void
  /** Mở hộp thoại thông tin ngày, focus vào ô địa điểm */
  onEditDayPlace?: () => void
}

/**
 * Phần thời tiết trong dải tóm tắt của ngày (docs/ui-slop-audit.md P3-LT-10): không có vỏ card riêng,
 * ItineraryTab bọc chung với dress code. PAST / NO_DATE → không hiện gì.
 */
export function DayWeatherCard(props: DayWeatherCardProps) {
  const { tripId, weather, fetchedAt, loading, canEdit, ownPlace, onEditTrip, onEditDayPlace } = props
  if (!weather) {
    return loading ? (
      <div className="flex items-center gap-3 p-4" aria-busy="true" aria-label="Đang tải dự báo thời tiết">
        <Skeleton className="size-11 shrink-0 rounded-item" />
        <div className="grid flex-1 gap-2">
          <Skeleton className="h-5 w-40 rounded-control" />
          <Skeleton className="h-4 w-56 max-w-full rounded-control" />
        </div>
      </div>
    ) : null
  }

  switch (weather.status) {
    case 'FORECAST': {
      const f = weather.forecast
      if (!f) return null
      return (
        <section aria-label="Dự báo thời tiết" className="grid gap-3 p-4">
          <div className="flex items-start gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-item bg-muted/60">
              <WeatherIcon condition={f.condition} className="size-6" />
            </span>
            <div className="grid min-w-0 flex-1 gap-1">
              <p className="flex flex-wrap items-baseline gap-x-2">
                <span className="font-semibold text-foreground">{f.label}</span>
                {f.tempMin != null && f.tempMax != null && (
                  <span className="font-bold tabular-nums text-foreground">
                    {round(f.tempMin)}–{round(f.tempMax)}°C
                  </span>
                )}
              </p>
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                {f.precipProbability != null && (
                  <span className="inline-flex items-center gap-1">
                    <Droplets className="size-3.5 text-info" aria-hidden="true" />
                    Mưa {f.precipProbability}%
                    {f.precipSum != null && f.precipSum >= RAIN_SUM_NOTICE_MM && ` · ${f.precipSum.toFixed(1)} mm`}
                  </span>
                )}
                {f.windMax != null && f.windMax >= WIND_NOTICE_KMH && (
                  <span className="inline-flex items-center gap-1 font-medium text-warning-soft-foreground">
                    <Wind className="size-3.5" aria-hidden="true" />
                    Gió mạnh {round(f.windMax)} km/h
                  </span>
                )}
                {f.uvMax != null && f.uvMax >= UV_NOTICE && (
                  <span className="inline-flex items-center gap-1 font-medium text-warning-soft-foreground">
                    <Sun className="size-3.5" aria-hidden="true" />
                    UV {round(f.uvMax)} (rất cao)
                  </span>
                )}
              </div>
            </div>
          </div>

          {(ownPlace && weather.placeName) || (canEdit && onEditDayPlace) ? (
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              {ownPlace && weather.placeName && (
                <span className="inline-flex min-w-0 items-center gap-1 text-sm text-foreground">
                  <MapPin className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <span className="break-words">{weather.placeName}</span>
                </span>
              )}
              {canEdit && onEditDayPlace && (
                <Button variant="ghost" size="sm" onClick={onEditDayPlace} className="-ml-2 text-primary-strong">
                  <MapPin />
                  {ownPlace ? 'Đổi địa điểm' : 'Ngày này ở nơi khác?'}
                </Button>
              )}
            </div>
          ) : null}

          <WeatherAdviceList tripId={tripId} advice={f.advice} canEdit={canEdit} />
          <Attribution time={fetchedTime(fetchedAt)} />
        </section>
      )
    }
    case 'TOO_FAR':
      return weather.availableFrom ? (
        <p className="flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground">
          <WeatherIcon condition="PARTLY_CLOUDY" className="size-4" colored={false} />
          Dự báo thời tiết có từ {formatShortDate(weather.availableFrom)}
        </p>
      ) : null
    case 'NO_LOCATION':
      return canEdit && onEditTrip ? (
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
          <p className="text-muted-foreground">Gắn vị trí điểm đến để xem dự báo thời tiết từng ngày.</p>
          <Button size="sm" variant="outline" onClick={onEditTrip}>
            <MapPin />
            Chọn vị trí
          </Button>
        </div>
      ) : null
    case 'UNAVAILABLE':
      return (
        <p className="flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground">
          <CloudOff className="size-4 shrink-0" aria-hidden="true" />
          Chưa lấy được dự báo thời tiết, thử lại sau nhé.
        </p>
      )
    default:
      return null
  }
}
