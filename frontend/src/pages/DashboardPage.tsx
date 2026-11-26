import { ChevronDown, KeyRound, Luggage, Plus } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { EmptyState, TabErrorState } from '@/components/common/states'
import { JoinCodeDialog } from '@/components/JoinCodeDialog'
import { TripCard, TripCardSkeleton } from '@/components/TripCard'
import { TripFormDialog } from '@/components/TripFormDialog'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/auth/useAuth'
import { useCreateTrip, useTrips } from '@/hooks/useTrips'
import type { TripRequest, TripSummaryResponse } from '@/types/trip'

/** Số chuyến đã qua hiện sẵn; còn lại nằm sau nút "Xem tất cả" */
const COMPLETED_PREVIEW = 3

/** So sánh ngày ISO (YYYY-MM-DD so được bằng chuỗi); thiếu ngày thì xếp cuối. */
function byDate(a: string | null, b: string | null): number {
  if (a === b) return 0
  if (a === null) return 1
  if (b === null) return -1
  return a < b ? -1 : 1
}

function groupTrips(trips: TripSummaryResponse[]) {
  const of = (status: TripSummaryResponse['status']) => trips.filter((t) => t.status === status)
  return {
    ongoing: of('ONGOING').sort((a, b) => byDate(a.startDate, b.startDate)),
    upcoming: of('UPCOMING').sort((a, b) => byDate(a.startDate, b.startDate)),
    planning: of('PLANNING').sort((a, b) => byDate(a.plannedStartDate, b.plannedStartDate)),
    // Chuyến vừa kết thúc lên trước
    completed: of('COMPLETED').sort((a, b) => byDate(b.endDate, a.endDate)),
  }
}

export function DashboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const trips = useTrips()
  const createTrip = useCreateTrip()
  const [createOpen, setCreateOpen] = useState(false)
  const [joinOpen, setJoinOpen] = useState(false)
  const [showAllCompleted, setShowAllCompleted] = useState(false)

  const handleCreate = async (body: TripRequest) => {
    const trip = await createTrip.mutateAsync(body)
    setCreateOpen(false)
    toast.success('Đã tạo chuyến đi. Gửi link mời cho cả nhóm nhé.')
    navigate(`/trips/${trip.id}`)
  }

  const { ongoing, upcoming, planning, completed } = groupTrips(trips.data ?? [])
  const next = [...upcoming, ...planning]
  const visibleCompleted = showAllCompleted ? completed : completed.slice(0, COMPLETED_PREVIEW)

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 space-y-1">
          {user && <p className="truncate text-sm font-medium text-muted-foreground">Xin chào {user.displayName}</p>}
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Chuyến đi của bạn</h1>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row-reverse sm:items-center">
          <Button size="lg" className="w-full sm:w-auto" onClick={() => setCreateOpen(true)}>
            <Plus />
            Tạo chuyến đi
          </Button>
          <Button variant="outline" className="w-full sm:w-auto" onClick={() => setJoinOpen(true)}>
            <KeyRound />
            Nhập mã mời
          </Button>
        </div>
      </section>

      {trips.isPending && (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <TripCardSkeleton key={i} />
          ))}
        </div>
      )}

      {trips.isError && (
        <TabErrorState error={trips.error} onRetry={() => trips.refetch()} title="Không tải được danh sách chuyến đi" />
      )}

      {trips.isSuccess && trips.data.length === 0 && (
        <EmptyState
          icon={Luggage}
          title="Chưa có chuyến đi nào"
          description="Tạo chuyến đi đầu tiên rồi rủ hội bạn vào, hoặc nhập mã mời nếu ai đó đã tạo sẵn."
          action={
            <>
              <Button onClick={() => setCreateOpen(true)}>
                <Plus />
                Tạo chuyến đi
              </Button>
              <Button variant="outline" onClick={() => setJoinOpen(true)}>
                <KeyRound />
                Nhập mã mời
              </Button>
            </>
          }
        />
      )}

      {ongoing.length > 0 && (
        <section aria-labelledby="trips-ongoing" className="space-y-3">
          <h2 id="trips-ongoing" className="text-lg font-bold text-foreground">
            Đang diễn ra
          </h2>
          {/* Chuyến đang đi là thứ cần mở nhất: thẻ rộng gấp đôi */}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {ongoing.map((trip) => (
              <div key={trip.id} className="sm:col-span-2">
                <TripCard trip={trip} />
              </div>
            ))}
          </div>
        </section>
      )}

      {next.length > 0 && (
        <section aria-labelledby={ongoing.length > 0 ? 'trips-next' : undefined} className="space-y-3">
          {ongoing.length > 0 && (
            <h2 id="trips-next" className="text-lg font-bold text-foreground">
              Sắp tới
            </h2>
          )}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {next.map((trip) => (
              <TripCard key={trip.id} trip={trip} />
            ))}
          </div>
        </section>
      )}

      {completed.length > 0 && (
        <section aria-labelledby="trips-completed" className="space-y-4 pt-4">
          <div className="flex items-center gap-2">
            <h2 id="trips-completed" className="text-lg font-bold text-muted-foreground">
              Kỷ niệm đã qua
            </h2>
            <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
              {completed.length}
            </span>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {visibleCompleted.map((trip) => (
              <TripCard key={trip.id} trip={trip} />
            ))}
          </div>
          {completed.length > COMPLETED_PREVIEW && (
            <Button variant="outline" onClick={() => setShowAllCompleted((v) => !v)} aria-expanded={showAllCompleted}>
              <ChevronDown className={showAllCompleted ? 'rotate-180' : undefined} />
              {showAllCompleted ? 'Thu gọn' : `Xem tất cả (${completed.length})`}
            </Button>
          )}
        </section>
      )}

      <TripFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        pending={createTrip.isPending}
        onSubmit={handleCreate}
      />
      <JoinCodeDialog open={joinOpen} onOpenChange={setJoinOpen} />
    </div>
  )
}
