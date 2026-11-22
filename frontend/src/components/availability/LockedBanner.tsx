import { LockOpen } from 'lucide-react'
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
        <Card className="rounded-[28px] shadow-clay-card border border-border/60 bg-gradient-to-br from-emerald-50/80 via-teal-50/70 to-card">
          <CardContent className="grid gap-4 p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800 shadow-clay-badge border border-emerald-300/80">
                    🎉 Đã chốt ngày chính thức
                  </span>
                  <p className="text-xl sm:text-2xl font-bold text-foreground pt-1">
                    {formatRangeWithWeekday(startDate, endDate)}
                  </p>
                  <p className="text-sm font-medium text-muted-foreground">{daysBetweenInclusive(startDate, endDate)} ngày trọn vẹn</p>
                </div>
                {canUnlock && (
            <Button
              variant="outline"
              size="sm"
              className="rounded-full font-semibold gap-1.5 shadow-clay-btn-outline"
              onClick={() => setConfirmOpen(true)}
            >
              <LockOpen className="size-4" />
              Mở lại khảo sát
            </Button>
          )}
        </div>

        <div className="-mx-2 flex gap-2.5 overflow-x-auto px-2 pb-1.5 scrollbar-none">
          {days.isPending
            ? [0, 1, 2].map((i) => <Skeleton key={i} className="h-18 w-24 shrink-0 rounded-2xl" />)
            : days.data
                ?.filter((day) => !day.overflow && day.date)
                .map((day) => (
                  <div
                    key={day.id}
                    className="w-22 shrink-0 rounded-2xl bg-card/90 px-3 py-2.5 text-center shadow-clay-card border border-border/60 transition-transform duration-200 hover:-translate-y-1"
                  >
                    <span className="inline-block rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary shadow-clay-badge border border-primary/20">
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
