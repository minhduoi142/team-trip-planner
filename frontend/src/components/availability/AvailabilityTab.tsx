import { CalendarPlus, RotateCw } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useAvailability } from '@/hooks/useAvailability'
import { useAvailabilityEditor, type Brush } from '@/hooks/useAvailabilityEditor'
import { getErrorMessage } from '@/lib/api'
import { roleAtLeast } from '@/lib/labels'
import type { AvailabilityStatus } from '@/types/availability'
import type { TripRole } from '@/types/trip'
import { AvailabilityGrid } from './AvailabilityGrid'
import { BrushBar } from './BrushBar'
import { LockedBanner } from './LockedBanner'
import { SuggestionPanel } from './SuggestionPanel'
import { STATUS_CELL } from './statusStyle'

interface AvailabilityTabProps {
  tripId: number
  myUserId: number
  myRole: TripRole
  /** Mở form sửa chuyến đi để nhập khoảng ngày dự kiến */
  onEditTrip: () => void
}

export function AvailabilityTab({ tripId, myUserId, myRole, onEditTrip }: AvailabilityTabProps) {
  const matrix = useAvailability(tripId)
  const editor = useAvailabilityEditor(tripId)
  const [brush, setBrush] = useState<Brush>('AVAILABLE')
  const canEditTrip = roleAtLeast(myRole, 'EDITOR')
  const isOwner = myRole === 'OWNER'

  if (matrix.isPending) {
    return (
      <div className="grid gap-4">
        <Skeleton className="h-48 rounded-3xl" />
        <Skeleton className="h-64 rounded-3xl" />
      </div>
    )
  }

  if (matrix.isError) {
    return (
      <div className="rounded-3xl border border-dashed p-8 text-center">
        <p className="text-muted-foreground">{getErrorMessage(matrix.error)}</p>
        <Button variant="outline" className="mt-4" onClick={() => matrix.refetch()}>
          <RotateCw />
          Thử lại
        </Button>
      </div>
    )
  }

  const data = matrix.data

  if (!data.rangeStart || !data.rangeEnd) {
    return (
      <div className="rounded-3xl border-2 border-dashed border-rose-200 bg-white/60 px-6 py-12 text-center">
        <p className="text-5xl">🗓️</p>
        <h2 className="mt-4 text-lg font-semibold">Chưa có khoảng ngày dự kiến</h2>
        <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
          {canEditTrip
            ? 'Nhập khoảng ngày cả nhóm có thể đi (vd: cả tháng 7), mọi người sẽ khai rảnh/bận trong khoảng đó.'
            : 'Nhờ trưởng nhóm nhập khoảng ngày dự kiến để cả nhóm bắt đầu khai lịch nhé.'}
        </p>
        {canEditTrip && (
          <Button size="lg" className="mt-6" onClick={onEditTrip}>
            <CalendarPlus />
            Đặt ngày dự kiến
          </Button>
        )}
      </div>
    )
  }

  const dates = data.days.map((d) => d.date)
  const serverStatus = new Map<string, AvailabilityStatus>()
  for (const entry of data.entries) {
    serverStatus.set(`${entry.userId}|${entry.date}`, entry.status)
  }
  const statusOf = (userId: number, date: string): AvailabilityStatus | null => {
    if (userId === myUserId && editor.pending.has(date)) {
      return editor.pending.get(date) ?? null
    }
    return serverStatus.get(`${userId}|${date}`) ?? null
  }
  const myStatus = (date: string) => statusOf(myUserId, date)
  const editable = !data.locked

  return (
    <div className="grid gap-4">
      {data.locked && data.startDate && data.endDate ? (
        <LockedBanner tripId={tripId} startDate={data.startDate} endDate={data.endDate} canUnlock={isOwner} />
      ) : (
        <SuggestionPanel tripId={tripId} matrix={data} canEditLength={canEditTrip} canLock={isOwner} />
      )}

      <Card>
        <CardHeader>
          <CardTitle>Lịch rảnh của cả nhóm</CardTitle>
          <CardDescription>
            {editable
              ? 'Chọn trạng thái ở thanh bên dưới rồi chạm hoặc kéo trên hàng "Bạn". Tự động lưu.'
              : 'Đã chốt ngày nên bảng chỉ để xem. Cột tô đậm là các ngày đi.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          <AvailabilityGrid
            matrix={data}
            dates={dates}
            myUserId={myUserId}
            editable={editable}
            statusOf={statusOf}
            onPaint={(date) => editor.paint([date], brush, myStatus)}
          />
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground" aria-label="Chú thích">
            {(['AVAILABLE', 'MAYBE', 'BUSY', 'NONE'] as const).map((key) => (
              <li key={key} className="flex items-center gap-1.5">
                <span
                  className={`flex size-4 items-center justify-center rounded text-[10px] font-bold ${STATUS_CELL[key].className}`}
                >
                  {STATUS_CELL[key].symbol}
                </span>
                {STATUS_CELL[key].label}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {editable && (
        <BrushBar
          brush={brush}
          onBrushChange={setBrush}
          onFillAll={() => editor.paint(dates, 'AVAILABLE', myStatus)}
          saveState={editor.saveState}
        />
      )}
    </div>
  )
}
