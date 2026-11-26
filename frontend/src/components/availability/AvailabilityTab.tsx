import { CalendarPlus, CalendarRange } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { EmptyState, TabErrorState, TabSkeleton } from '@/components/common/states'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAvailability } from '@/hooks/useAvailability'
import { useAvailabilityEditor, type Brush } from '@/hooks/useAvailabilityEditor'
import { roleAtLeast } from '@/lib/labels'
import { cn } from '@/lib/utils'
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

  const data = matrix.data
  const serverStatus = new Map<string, AvailabilityStatus>()
  for (const entry of data?.entries ?? []) {
    serverStatus.set(`${entry.userId}|${entry.date}`, entry.status)
  }
  const statusOf = (userId: number, date: string): AvailabilityStatus | null => {
    if (userId === myUserId && editor.pending.has(date)) {
      return editor.pending.get(date) ?? null
    }
    return serverStatus.get(`${userId}|${date}`) ?? null
  }
  const myStatus = (date: string) => statusOf(myUserId, date)

  // Nút "Hoàn tác" trong toast chạy sau vài render: luôn so với trạng thái mới nhất
  const myStatusRef = useRef(myStatus)
  useEffect(() => {
    myStatusRef.current = myStatus
  })

  if (matrix.isPending) {
    return (
      <div className="grid gap-6">
        <TabSkeleton variant="list" rows={2} />
        <TabSkeleton variant="grid" rows={2} />
      </div>
    )
  }

  if (matrix.isError || !data) {
    return <TabErrorState error={matrix.error} onRetry={() => matrix.refetch()} />
  }

  if (!data.rangeStart || !data.rangeEnd) {
    return (
      <EmptyState
        icon={CalendarRange}
        title="Chưa có khoảng ngày dự kiến"
        description={
          canEditTrip
            ? 'Nhập khoảng ngày cả nhóm có thể đi (vd: cả tháng 7), mọi người sẽ khai rảnh/bận trong khoảng đó.'
            : 'Nhờ trưởng nhóm nhập khoảng ngày dự kiến để cả nhóm bắt đầu khai lịch nhé.'
        }
        action={
          canEditTrip && (
            <Button onClick={onEditTrip}>
              <CalendarPlus />
              Đặt ngày dự kiến
            </Button>
          )
        }
      />
    )
  }

  const dates = data.days.map((d) => d.date)
  const editable = !data.locked

  /** Tô "Rảnh" cả hàng, kèm "Hoàn tác" khôi phục đúng trạng thái từng ngày trước đó. */
  const fillAll = () => {
    const previous = new Map<string, AvailabilityStatus | null>()
    for (const date of dates) {
      const status = myStatus(date)
      if (status !== 'AVAILABLE') previous.set(date, status)
    }
    if (previous.size === 0) {
      toast('Bạn đã rảnh tất cả các ngày')
      return
    }
    editor.paint(dates, 'AVAILABLE', myStatus)
    toast(`Đã đánh dấu rảnh ${previous.size} ngày`, {
      action: {
        label: 'Hoàn tác',
        onClick: () => {
          const groups = new Map<Brush, string[]>()
          previous.forEach((status, date) => {
            const key: Brush = status ?? 'CLEAR'
            groups.set(key, [...(groups.get(key) ?? []), date])
          })
          groups.forEach((groupDates, key) => editor.paint(groupDates, key, (d) => myStatusRef.current(d)))
        },
      },
    })
  }

  return (
    <div className="grid gap-6">
      {data.locked && data.startDate && data.endDate ? (
        <LockedBanner tripId={tripId} startDate={data.startDate} endDate={data.endDate} canUnlock={isOwner} />
      ) : (
        <SuggestionPanel tripId={tripId} matrix={data} canEditLength={canEditTrip} canLock={isOwner} />
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-bold">Lịch rảnh của cả nhóm</CardTitle>
          <CardDescription>
            {editable
              ? 'Chọn trạng thái ở thanh bên dưới rồi chạm hoặc kéo trên hàng của bạn (hàng đầu tiên). Tự động lưu.'
              : 'Đã chốt ngày nên bảng chỉ để xem. Các cột nền hồng là những ngày đi.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 px-0 sm:px-(--card-spacing)">
          <AvailabilityGrid
            matrix={data}
            dates={dates}
            myUserId={myUserId}
            editable={editable}
            statusOf={statusOf}
            onPaint={(date) => editor.paint([date], brush, myStatus)}
          />
          <ul
            className="mx-(--card-spacing) flex flex-wrap gap-x-4 gap-y-2 border-t border-border pt-3 text-xs font-semibold text-muted-foreground sm:mx-0"
            aria-label="Chú thích"
          >
            {(['AVAILABLE', 'MAYBE', 'BUSY', 'NONE'] as const).map((key) => {
              const Icon = STATUS_CELL[key].icon
              return (
                <li key={key} className="flex items-center gap-1.5">
                  <span
                    className={cn('flex size-5 items-center justify-center rounded-md', STATUS_CELL[key].className)}
                    aria-hidden="true"
                  >
                    {Icon && <Icon className="size-3.5" strokeWidth={3} />}
                  </span>
                  {STATUS_CELL[key].label}
                </li>
              )
            })}
          </ul>
        </CardContent>
      </Card>

      {editable && <BrushBar brush={brush} onBrushChange={setBrush} onFillAll={fillAll} saveState={editor.saveState} />}
    </div>
  )
}
