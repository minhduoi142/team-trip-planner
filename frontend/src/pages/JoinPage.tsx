import { CalendarDays, MapPin, Users } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { AuthShell } from '@/components/AuthShell'
import { StatusBadge } from '@/components/StatusBadge'
import { TripCover } from '@/components/TripCover'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/auth/useAuth'
import { useInvitePreview, useJoinTrip } from '@/hooks/useTrips'
import { getErrorCode, getErrorMessage } from '@/lib/api'
import { formatDateRange } from '@/lib/date'
import { loginPath } from '@/lib/redirect'

export function JoinPage() {
  const { code = '' } = useParams()
  const navigate = useNavigate()
  const { status } = useAuth()
  const preview = useInvitePreview(code)
  const join = useJoinTrip()

  const doJoin = () =>
    join.mutate(code, {
      onSuccess: (result) => {
        toast.success(result.alreadyMember ? 'Bạn đã ở trong nhóm này rồi' : 'Vào nhóm thành công! 🎉')
        navigate(`/trips/${result.tripId}`, { replace: true })
      },
      onError: (error) => toast.error(getErrorMessage(error)),
    })

  if (preview.isPending) {
    return (
      <AuthShell>
        <Card className="overflow-hidden p-0">
          <Skeleton className="h-36 rounded-none" />
          <CardContent className="space-y-3 p-6">
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </AuthShell>
    )
  }

  if (preview.isError) {
    const notFound = getErrorCode(preview.error) === 'INVITE_NOT_FOUND'
    return (
      <AuthShell>
        <Card>
          <CardContent className="space-y-4 p-6 text-center">
            <p className="text-4xl">🥲</p>
            <h1 className="text-lg font-semibold">{notFound ? 'Mã mời không còn hiệu lực' : 'Không tải được lời mời'}</h1>
            <p className="text-sm text-muted-foreground">
              {notFound
                ? 'Có thể trưởng nhóm đã tạo mã mới. Hãy xin lại link mời mới nhất nhé.'
                : getErrorMessage(preview.error)}
            </p>
            <Button asChild variant="outline">
              <Link to="/trips">Về trang chủ</Link>
            </Button>
          </CardContent>
        </Card>
      </AuthShell>
    )
  }

  const trip = preview.data
  const range =
    formatDateRange(trip.startDate, trip.endDate) ??
    (formatDateRange(trip.plannedStartDate, trip.plannedEndDate) &&
      `Dự kiến ${formatDateRange(trip.plannedStartDate, trip.plannedEndDate)}`)

  return (
    <AuthShell>
      <Card className="overflow-hidden p-0 shadow-xl shadow-rose-200/40">
        <TripCover coverImageUrl={trip.coverImageUrl} seed={code.length} withOverlay className="h-40">
          <div className="flex h-full flex-col justify-end p-5 text-white">
            <p className="text-sm text-white/90">Bạn được mời tham gia</p>
            <h1 className="text-2xl leading-tight font-bold drop-shadow">{trip.title}</h1>
          </div>
        </TripCover>
        <CardContent className="space-y-4 p-6">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={trip.status} />
          </div>
          <ul className="space-y-2 text-sm text-muted-foreground">
            {trip.destination && (
              <li className="flex items-center gap-2">
                <MapPin className="size-4" />
                {trip.destination}
              </li>
            )}
            {range && (
              <li className="flex items-center gap-2">
                <CalendarDays className="size-4" />
                {range}
              </li>
            )}
            <li className="flex items-center gap-2">
              <Users className="size-4" />
              {trip.memberCount} người đã tham gia
            </li>
          </ul>

          {status === 'authenticated' ? (
            <Button size="lg" className="w-full" onClick={doJoin} disabled={join.isPending}>
              {join.isPending ? 'Đang vào nhóm…' : 'Tham gia chuyến đi'}
            </Button>
          ) : (
            <Button asChild size="lg" className="w-full" disabled={status === 'loading'}>
              <Link to={loginPath(`/join/${code}`)}>Đăng nhập để tham gia</Link>
            </Button>
          )}
        </CardContent>
      </Card>
    </AuthShell>
  )
}
