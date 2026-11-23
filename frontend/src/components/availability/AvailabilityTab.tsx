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
        <div className="grid gap-6">
          <Skeleton className="h-48 rounded-[28px]" />
          <Skeleton className="h-64 rounded-[28px]" />
        </div>
        )
  }

        if (matrix.isError) {
    return (
          <div className="rounded-[32px] border-2 border-dashed border-destructive/40 bg-card/80 p-8 text-center shadow-clay-card">
            <p className="text-muted-foreground">{getErrorMessage(matrix.error)}</p>
              <Button variant="outline" className="mt-4 rounded-full" onClick={() => matrix.refetch()}>
                <RotateCw />
                Thử lại
              </Button>
          </div>
          )
  }

          const data = matrix.data

          if (!data.rangeStart || !data.rangeEnd) {
    return (
              <div className="rounded-[32px] border-2 border-dashed border-rose-300/80 bg-card/90 backdrop-blur-xs px-6 py-14 text-center shadow-clay-card">
                <div className="inline-flex size-20 items-center justify-center rounded-full bg-rose-100 shadow-clay-badge animate-float-slow text-4xl mb-4">
                  🗓️
                </div>
                <h2 className="text-xl font-bold text-foreground">Chưa có khoảng ngày dự kiến</h2>
                <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground leading-relaxed">
                  {canEditTrip
                    ? 'Nhập khoảng ngày cả nhóm có thể đi (vd: cả tháng 7), mọi người sẽ khai rảnh/bận trong khoảng đó.'
                    : 'Nhờ trưởng nhóm nhập khoảng ngày dự kiến để cả nhóm bắt đầu khai lịch nhé.'}
                </p>
                {canEditTrip && (
                    <Button size="lg" className="mt-6 gap-2" onClick={onEditTrip}>
                      <CalendarPlus className="size-4" />
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
                  <div className="grid gap-6 animate-cascade">
                    {data.locked && data.startDate && data.endDate ? (
                      <LockedBanner tripId={tripId} startDate={data.startDate} endDate={data.endDate} canUnlock={isOwner} />
                    ) : (
                      <SuggestionPanel tripId={tripId} matrix={data} canEditLength={canEditTrip} canLock={isOwner} />
                    )}

                      <Card className="rounded-[28px] shadow-clay-card border border-border/60 bg-card p-1 sm:p-2">
                        <CardHeader>
                          <CardTitle className="text-lg font-bold flex items-center gap-2">
                            <span>Lịch rảnh của cả nhóm</span>
                            <span className="text-sm font-normal text-muted-foreground">🎨</span>
                          </CardTitle>
                          <CardDescription>
                            {editable
                              ? 'Chọn trạng thái ở thanh bên dưới rồi chạm hoặc kéo trên hàng "Bạn". Tự động lưu.'
                              : 'Đã chốt ngày nên bảng chỉ để xem. Cột tô đậm là các ngày đi.'}
                          </CardDescription>
                        </CardHeader>
                          <CardContent className="grid gap-4">
                            <AvailabilityGrid
                              matrix={data}
                              dates={dates}
                              myUserId={myUserId}
                              editable={editable}
                              statusOf={statusOf}
                              onPaint={(date) => editor.paint([date], brush, myStatus)}
                            />
                              <ul className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground font-semibold pt-1 border-t border-border/40" aria-label="Chú thích">
                                {(['AVAILABLE', 'MAYBE', 'BUSY', 'NONE'] as const).map((key) => (
                                  <li key={key} className="flex items-center gap-1.5">
                                    <span
                                      className={`flex size-5 items-center justify-center rounded-lg text-xs font-bold ${STATUS_CELL[key].className}`}
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
