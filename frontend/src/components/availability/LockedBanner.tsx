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
    <Card className="bg-gradient-to-br from-emerald-50 to-teal-50">
      <CardContent className="grid gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm text-emerald-700">🎉 Đã chốt ngày đi</p>
            <p className="text-xl font-bold">{formatRangeWithWeekday(startDate, endDate)}</p>
            <p className="text-sm text-muted-foreground">{daysBetweenInclusive(startDate, endDate)} ngày</p>
          </div>
          {canUnlock && (
            <Button variant="outline" size="sm" onClick={() => setConfirmOpen(true)}>
              <LockOpen />
              Mở lại khảo sát
            </Button>
          )}
        </div>

        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {days.isPending
            ? [0, 1, 2].map((i) => <Skeleton key={i} className="h-16 w-20 shrink-0 rounded-2xl" />)
            : days.data?.map((day) => (
                <div key={day.id} className="w-20 shrink-0 rounded-2xl bg-background px-3 py-2 text-center ring-1 ring-border">
                  <p className="text-xs font-semibold text-primary">Ngày {day.dayIndex}</p>
                  <p className="text-sm font-medium">{weekdayShort(day.date)}</p>
                  <p className="text-xs text-muted-foreground">{formatShortDate(day.date)}</p>
                </div>
              ))}
        </div>
      </CardContent>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Mở lại khảo sát lịch rảnh?"
        description="Ngày chính thức và danh sách ngày đi sẽ bị xóa. Lịch rảnh mọi người đã khai vẫn được giữ nguyên."
        confirmLabel="Mở lại"
        destructive
        pending={unlock.isPending}
        onConfirm={doUnlock}
      />
    </Card>
  )
}
