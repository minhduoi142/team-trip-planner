import { Camera, Sunrise, Sunset } from 'lucide-react'
import { sameClockAsVietnam } from '@/lib/sunTimes'
import type { IsoDate } from '@/types/api'
import type { SunResponse } from '@/types/weather'

/**
 * Giờ mặt trời mọc/lặn + khung giờ vàng của ngày (docs/sdd-golden-hour-outfit.md A.5). Nằm trong dải tóm tắt
 * của ngày, ngay dưới thời tiết; hiện cả khi chưa tới tầm dự báo (giờ mặt trời tính được cho mọi ngày).
 */
export function SunTimesRow({ sun, date }: { sun: SunResponse | null | undefined; date: IsoDate | null }) {
  if (!sun) return null
  const foreign = !sameClockAsVietnam(sun.timezone, date)
  return (
    <section aria-label="Giờ mặt trời và giờ vàng chụp ảnh" className="grid gap-2 px-4 py-3 text-sm">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <Sunrise className="size-4 text-warning" aria-hidden="true" />
          Mọc <b className="font-semibold text-foreground tabular-nums">{sun.sunrise}</b>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Sunset className="size-4 text-warning" aria-hidden="true" />
          Lặn <b className="font-semibold text-foreground tabular-nums">{sun.sunset}</b>
        </span>
        {foreign && <span className="text-xs">(giờ địa phương)</span>}
      </div>
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-warning-soft px-2.5 py-0.5 text-xs font-semibold text-warning-soft-foreground">
          <Camera className="size-3.5" aria-hidden="true" />
          Giờ vàng
        </span>
        <span className="text-foreground tabular-nums">
          sáng {sun.morningGoldenStart}–{sun.morningGoldenEnd}
          <span className="text-muted-foreground"> · </span>
          chiều {sun.eveningGoldenStart}–{sun.eveningGoldenEnd}
        </span>
      </p>
    </section>
  )
}
