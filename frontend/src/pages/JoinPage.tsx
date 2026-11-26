import { ArrowRight, CalendarDays, MapPin, RotateCw, TicketX, Users } from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { AuthShell } from '@/components/AuthShell'
import { StatusBadge } from '@/components/StatusBadge'
import { TripCover } from '@/components/TripCover'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/common/states'
import { FieldError } from '@/components/common/layout'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/auth/useAuth'
import { useInvitePreview, useJoinTrip } from '@/hooks/useTrips'
import { getErrorCode, getErrorMessage } from '@/lib/api'
import { formatDateRange } from '@/lib/date'
import { extractInviteCode, joinReturnTo } from '@/lib/inviteCode'
import { loginPath } from '@/lib/redirect'

export function JoinPage() {
  const { code = '' } = useParams()
  const navigate = useNavigate()
  const { status } = useAuth()
  const [params] = useSearchParams()
  const preview = useInvitePreview(code)
  const join = useJoinTrip()
  const { mutate } = join

  const doJoin = useCallback(
    () =>
      mutate(code, {
        onSuccess: (result) => {
          toast.success(result.alreadyMember ? 'Bạn đã ở trong nhóm này rồi' : 'Đã vào nhóm')
          navigate(`/trips/${result.tripId}`, { replace: true })
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      }),
    [mutate, code, navigate],
  )

  // Người được mời vừa đăng ký/đăng nhập xong (returnTo có ?auto=1) → tự vào nhóm, khỏi bấm lần nữa.
  // Backend join idempotent nên gọi lại cũng an toàn.
  const autoJoin = params.get('auto') === '1'
  const autoJoined = useRef(false)
  useEffect(() => {
    if (autoJoin && status === 'authenticated' && !autoJoined.current) {
      autoJoined.current = true
      doJoin()
    }
  }, [autoJoin, status, doJoin])

  if (preview.isPending) {
    return (
      <AuthShell>
        <Card className="rounded-overlay overflow-hidden p-0">
          <Skeleton className="h-44 rounded-none" />
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
        <Card className="rounded-overlay p-0">
          <CardContent className="grid gap-4 p-6 sm:p-8">
            <EmptyState
              icon={TicketX}
              title={notFound ? 'Mã mời không còn hiệu lực' : 'Không tải được lời mời'}
              description={
                notFound
                  ? 'Có thể trưởng nhóm đã tạo mã mới. Xin lại link mời mới nhất, hoặc nhập mã mới bên dưới.'
                  : getErrorMessage(preview.error)
              }
              className="border-0 px-0 py-2"
              action={
                notFound ? undefined : (
                  <Button onClick={() => preview.refetch()} disabled={preview.isFetching}>
                    <RotateCw />
                    {preview.isFetching ? 'Đang thử lại…' : 'Thử lại'}
                  </Button>
                )
              }
            />
            {notFound && <NewCodeForm />}
            <Button asChild variant="ghost" className="justify-self-center">
              <Link to={status === 'authenticated' ? '/trips' : '/'}>
                {status === 'authenticated' ? 'Về trang chuyến đi' : 'Về trang chủ'}
              </Link>
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
      <Card className="rounded-overlay overflow-hidden p-0">
        <TripCover coverImageUrl={trip.coverImageUrl} seed={trip.coverSeed} withOverlay className="min-h-44">
          <div className="flex h-full min-h-44 flex-col justify-end p-5 text-white">
            <p className="text-xs font-bold uppercase tracking-wider text-white/90">Bạn được mời tham gia</p>
            <h1 className="line-clamp-3 text-2xl leading-tight font-bold break-words drop-shadow">{trip.title}</h1>
          </div>
        </TripCover>
        <CardContent className="space-y-4 p-6 sm:p-7">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={trip.status} />
          </div>
          <ul className="space-y-2.5 text-sm font-semibold text-foreground/80">
            {trip.destination && (
              <li className="flex min-w-0 items-center gap-2">
                <MapPin className="size-4 shrink-0 text-primary-strong" />
                <span className="truncate">{trip.destination}</span>
              </li>
            )}
            {range && (
              <li className="flex items-center gap-2">
                <CalendarDays className="size-4 text-primary-strong" />
                <span>{range}</span>
              </li>
            )}
            <li className="flex items-center gap-2">
              <Users className="size-4 text-primary-strong" />
              <span>{trip.memberCount} người đã tham gia</span>
            </li>
          </ul>

          <div className="pt-2">
            {status === 'authenticated' ? (
              <Button size="lg" className="w-full" onClick={doJoin} disabled={join.isPending}>
                {join.isPending ? 'Đang vào nhóm…' : 'Tham gia chuyến đi'}
                {!join.isPending && <ArrowRight />}
              </Button>
            ) : status === 'loading' ? (
              // Chưa biết đã đăng nhập hay chưa: nút thật bị khoá (Button asChild bọc Link thì disabled không có tác dụng)
              <div className="grid gap-2.5">
                <Button size="lg" className="w-full" disabled>
                  Đang kiểm tra đăng nhập…
                </Button>
              </div>
            ) : (
              // Người lạ: đăng ký (nút chính) hoặc đăng nhập → quay lại đây và tự vào nhóm
              <div className="grid gap-2.5">
                <Button asChild size="lg" className="w-full">
                  <Link to={`/register?returnTo=${encodeURIComponent(joinReturnTo(code))}`}>
                    Tạo tài khoản & tham gia
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="w-full">
                  <Link to={loginPath(joinReturnTo(code))}>Tôi đã có tài khoản</Link>
                </Button>
                <p className="text-center text-xs text-muted-foreground">Miễn phí. Đăng ký xong là vào nhóm ngay.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </AuthShell>
  )
}

/** Mã cũ hết hiệu lực: cho nhập mã/link mới ngay tại chỗ thay vì phải quay về trang chủ. */
function NewCodeForm() {
  const navigate = useNavigate()
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const next = extractInviteCode(value)
    if (next.length < 4) {
      setError('Nhập mã mời (8 ký tự) hoặc dán link mời.')
      return
    }
    setValue('')
    navigate(`/join/${next}`)
  }

  return (
    <form onSubmit={submit} noValidate className="grid gap-2">
      <Label htmlFor="join-new-code">Mã mời mới</Label>
      <div className="flex gap-2">
        <Input
          id="join-new-code"
          value={value}
          onChange={(e) => {
            setValue(e.target.value)
            setError(null)
          }}
          placeholder="Mã hoặc link mời"
          autoCapitalize="characters"
          autoComplete="off"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? 'join-new-code-error' : undefined}
          className="h-11 min-w-0 flex-1"
        />
        <Button type="submit" className="h-11 shrink-0">
          Mở
        </Button>
      </div>
      <FieldError id="join-new-code-error">{error}</FieldError>
    </form>
  )
}
