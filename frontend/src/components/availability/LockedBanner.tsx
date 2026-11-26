import { CalendarCheck, LockOpen } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useTripDays, useUnlockDate } from '@/hooks/useAvailability'
import { getErrorMessage } from '@/lib/api'
import { daysBetweenInclusive, formatRangeWithWeekday, formatShortDate, weekdayShort } from '@/lib/date'

interface LockedBannerProps {
  tripId: number
  startDate: string
  endDate: string
  canUnlock: boolean
}

export function LockedBanner({ tripId, startDate, endDate, canUnlock }: LockedBannerProps) {
  const days = useTripDays(tripId, true)
  const unlock = useUnlockDate(tripId)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const doUnlock = () =>
    unlock.mutate(undefined, {
      onSuccess: () => {
        setConfirmOpen(false)
        toast.success('Đã mở lại khảo sát, mọi người có thể sửa lịch rảnh')
      },
      onError: (error) => toast.error(getErrorMessage(error)),
    })

  return (
    <Card>
      <CardContent className="grid gap-4 p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-success-soft px-3 py-1 text-xs font-bold text-success-soft-foreground">
              <CalendarCheck className="size-3.5" aria-hidden="true" />
              Đã chốt ngày chính thức
            </span>
            <p className="pt-1 text-xl font-bold text-foreground sm:text-2xl">
              {formatRangeWithWeekday(startDate, endDate)}
            </p>
            <p className="text-sm font-medium text-muted-foreground">
              {daysBetweenInclusive(startDate, endDate)} ngày trọn vẹn
            </p>
          </div>
          {canUnlock && (
            <Button variant="outline" size="sm" onClick={() => setConfirmOpen(true)}>
              <LockOpen className="size-4" />
              Mở lại khảo sát
            </Button>
          )}
        </div>

        <div className="-mx-2 flex gap-2.5 overflow-x-auto px-2 pb-1.5 no-scrollbar">
          {days.isPending
            ? [0, 1, 2].map((i) => <Skeleton key={i} className="h-18 w-22 shrink-0 rounded-item" />)
            : days.data
                ?.filter((day) => !day.overflow && day.date)
                .map((day) => (
                  <div
                    key={day.id}
                    className="w-22 shrink-0 rounded-item border border-border bg-background/60 px-3 py-2.5 text-center"
                  >
                    <span className="inline-block rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary-strong">
                      Ngày {day.dayIndex}
                    </span>
                    <p className="mt-1 text-sm font-bold text-foreground">{day.date && weekdayShort(day.date)}</p>
                    <p className="text-xs font-medium text-muted-foreground">{day.date && formatShortDate(day.date)}</p>
                  </div>
                ))}
        </div>
      </CardContent>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Mở lại khảo sát ngày?"
        description="Ngày chốt sẽ bị hủy, mọi người có thể sửa lại lịch rảnh. Các hoạt động lịch trình đã lên vẫn được giữ nguyên."
        confirmLabel="Mở lại khảo sát"
        pending={unlock.isPending}
        onConfirm={doUnlock}
      />
    </Card>
  )
}
