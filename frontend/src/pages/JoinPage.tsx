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
          <Card className="overflow-hidden rounded-[32px] border-2 border-white/80 bg-card/95 p-0 shadow-clay-card">
            <Skeleton className="h-36 rounded-none" />
            <CardContent className="space-y-3 p-6">
              <Skeleton className="h-6 w-2/3 rounded-full" />
              <Skeleton className="h-4 w-1/2 rounded-full" />
              <Skeleton className="h-10 w-full rounded-full" />
            </CardContent>
          </Card>
      </AuthShell>
    )
  }

  if (preview.isError) {
    const notFound = getErrorCode(preview.error) === 'INVITE_NOT_FOUND'
    return (
      <AuthShell>
              <Card className="rounded-[32px] border-2 border-white/80 bg-card/95 shadow-clay-card">
                <CardContent className="space-y-4 p-8 text-center">
                  <p className="text-5xl animate-float-slow">🥲</p>
                  <h1 className="text-xl font-bold text-foreground">{notFound ? 'Mã mời không còn hiệu lực' : 'Không tải được lời mời'}</h1>
                  <p className="text-sm text-muted-foreground font-medium">
                    {notFound
                      ? 'Có thể trưởng nhóm đã tạo mã mới. Hãy xin lại link mời mới nhất nhé.'
                      : getErrorMessage(preview.error)}
                  </p>
                    <Button asChild variant="outline" className="rounded-full shadow-clay-card hover:-translate-y-0.5">
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
                  <Card className="overflow-hidden rounded-[32px] border-2 border-white/80 bg-card/95 shadow-clay-card p-0 transition-all duration-300">
                    <TripCover coverImageUrl={trip.coverImageUrl} seed={code.length} withOverlay className="h-44">
                      <div className="flex h-full flex-col justify-end p-5 text-white">
                        <p className="text-xs font-bold uppercase tracking-wider text-white/90">Bạn được mời tham gia</p>
                        <h1 className="text-2xl font-bold leading-tight drop-shadow">{trip.title}</h1>
                      </div>
                    </TripCover>
                      <CardContent className="space-y-4 p-6 sm:p-7">
                        <div className="flex flex-wrap items-center gap-2">
                          <StatusBadge status={trip.status} />
                        </div>
                          <ul className="space-y-2.5 text-sm font-semibold text-foreground/80">
                            {trip.destination && (
                              <li className="flex items-center gap-2">
                                <MapPin className="size-4 text-primary" />
                                <span>{trip.destination}</span>
                              </li>
                            )}
                            {range && (
                              <li className="flex items-center gap-2">
                                <CalendarDays className="size-4 text-primary" />
                                <span>{range}</span>
                              </li>
                            )}
                            <li className="flex items-center gap-2">
                              <Users className="size-4 text-primary" />
                              <span>{trip.memberCount} người đã tham gia</span>
                            </li>
                          </ul>

                          <div className="pt-2">
                            {status === 'authenticated' ? (
                              <Button size="lg" className="w-full rounded-full shadow-clay-btn-primary font-bold h-12 text-base" onClick={doJoin} disabled={join.isPending}>
                                {join.isPending ? 'Đang vào nhóm…' : 'Tham gia chuyến đi ✨'}
                              </Button>
                            ) : (
                              <Button asChild size="lg" className="w-full rounded-full shadow-clay-btn-primary font-bold h-12 text-base" disabled={status === 'loading'}>
                                <Link to={loginPath(`/join/${code}`)}>Đăng nhập để tham gia</Link>
                              </Button>
                            )}
                          </div>
                      </CardContent>
                  </Card>
                </AuthShell>
                )
}
