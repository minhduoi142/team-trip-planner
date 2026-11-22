import { KeyRound, Plus, RotateCw } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { JoinCodeDialog } from '@/components/JoinCodeDialog'
import { TripCard, TripCardSkeleton } from '@/components/TripCard'
import { TripFormDialog } from '@/components/TripFormDialog'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/auth/useAuth'
import { useCreateTrip, useTrips } from '@/hooks/useTrips'
import { getErrorMessage } from '@/lib/api'
import type { TripRequest } from '@/types/trip'

export function DashboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const trips = useTrips()
  const createTrip = useCreateTrip()
  const [createOpen, setCreateOpen] = useState(false)
  const [joinOpen, setJoinOpen] = useState(false)

  const handleCreate = async (body: TripRequest) => {
    const trip = await createTrip.mutateAsync(body)
    setCreateOpen(false)
    toast.success('Đã tạo chuyến đi! Gửi link mời cho cả nhóm thôi 💌')
    navigate(`/trips/${trip.id}`)
  }

  const active = trips.data?.filter((t) => t.status !== 'COMPLETED') ?? []
  const completed = trips.data?.filter((t) => t.status === 'COMPLETED') ?? []

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Xin chào {user?.displayName} 👋</p>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Chuyến đi của bạn</h1>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <Button variant="outline" size="lg" onClick={() => setJoinOpen(true)}>
            <KeyRound />
            Nhập mã mời
          </Button>
          <Button size="lg" onClick={() => setCreateOpen(true)}>
            <Plus />
            Tạo chuyến đi
          </Button>
        </div>
      </section>

      {trips.isPending && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <TripCardSkeleton key={i} />
          ))}
        </div>
      )}

      {trips.isError && (
        <div className="rounded-3xl border border-dashed p-8 text-center">
          <p className="text-muted-foreground">{getErrorMessage(trips.error)}</p>
          <Button variant="outline" className="mt-4" onClick={() => trips.refetch()}>
            <RotateCw />
            Thử lại
          </Button>
        </div>
      )}

      {trips.isSuccess && trips.data.length === 0 && (
        <div className="rounded-3xl border-2 border-dashed border-rose-200 bg-white/60 px-6 py-12 text-center">
          <p className="text-5xl">🧳</p>
          <h2 className="mt-4 text-lg font-semibold">Chưa có chuyến đi nào</h2>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
            Tạo chuyến đi đầu tiên rồi rủ hội bạn vào, hoặc nhập mã mời nếu ai đó đã tạo sẵn.
          </p>
          <Button size="lg" className="mt-6" onClick={() => setCreateOpen(true)}>
            <Plus />
            Tạo chuyến đi đầu tiên
          </Button>
        </div>
      )}

      {active.length > 0 && (
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {active.map((trip) => (
            <TripCard key={trip.id} trip={trip} />
          ))}
        </section>
      )}

      {completed.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-muted-foreground">Kỷ niệm đã qua</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {completed.map((trip) => (
              <TripCard key={trip.id} trip={trip} />
            ))}
          </div>
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
