import {
  ArrowLeft,
  Bell,
  BellOff,
  CalendarDays,
  Lock,
  MapPin,
  MapPinOff,
  MoreHorizontal,
  Pencil,
  Trash2,
} from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { AlbumTab } from '@/components/album/AlbumTab'
import { AvailabilityTab } from '@/components/availability/AvailabilityTab'
import { ChecklistTab } from '@/components/checklist/ChecklistTab'
import { ExpensesTab } from '@/components/expenses/ExpensesTab'
import { RoomsTab } from '@/components/rooms/RoomsTab'
import { ItineraryTab } from '@/components/itinerary/ItineraryTab'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { EmptyState } from '@/components/common/states'
import { IdeasTab } from '@/components/IdeasTab'
import { CountdownLabel } from '@/components/CountdownLabel'
import { InviteShare } from '@/components/InviteShare'
import { MemberList } from '@/components/MemberList'
import { StatusBadge } from '@/components/StatusBadge'
import { TripCover } from '@/components/TripCover'
import { TripFormDialog } from '@/components/TripFormDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuth } from '@/auth/useAuth'
import { useSetTripMute, useTripMute } from '@/hooks/useNotificationSettings'
import { useDeleteTrip, useTrip, useUpdateTrip } from '@/hooks/useTrips'
import { getErrorCode, getErrorMessage } from '@/lib/api'
import { formatDateRange } from '@/lib/date'
import { extractInviteCode } from '@/lib/inviteCode'
import { roleAtLeast } from '@/lib/labels'
import type { TripRequest } from '@/types/trip'

/** Giá trị tab hợp lệ cho ?tab= (link trong email mở thẳng đúng tab). */
const TAB_VALUES = ['overview', 'availability', 'itinerary', 'polls', 'checklist', 'expenses', 'rooms', 'album']

export function TripDetailPage() {
  const { tripId: tripIdParam } = useParams()
  const tripId = Number(tripIdParam)
  const navigate = useNavigate()
  const { user } = useAuth()
  const trip = useTrip(tripId)
  const updateTrip = useUpdateTrip(tripId)
  const deleteTrip = useDeleteTrip(tripId)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [params, setParams] = useSearchParams()
  const tabParam = params.get('tab')
  const tab = tabParam && TAB_VALUES.includes(tabParam) ? tabParam : 'overview'
  const changeTab = (value: string) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (value === 'overview') next.delete('tab')
        else next.set('tab', value)
        return next
      },
      { replace: true },
    )

  const tabsListRef = useRef<HTMLDivElement>(null)
  const tripLoaded = trip.isSuccess
  useEffect(() => {
    if (!tripLoaded) return
    tabsListRef.current
      ?.querySelector<HTMLElement>('[data-state="active"]')
      ?.scrollIntoView({ inline: 'center', block: 'nearest' })
  }, [tab, tripLoaded])

  if (trip.isPending) return <TripDetailSkeleton />

  if (trip.isError) {
    const code = getErrorCode(trip.error)
    const title =
      code === 'NOT_TRIP_MEMBER'
        ? 'Bạn chưa ở trong chuyến đi này'
        : code === 'TRIP_NOT_FOUND'
          ? 'Không tìm thấy chuyến đi'
          : 'Không tải được chuyến đi'
    return (
      <div className="mx-auto max-w-md py-12">
        <EmptyState
          icon={code === 'NOT_TRIP_MEMBER' ? Lock : MapPinOff}
          title={title}
          description={
            code === 'NOT_TRIP_MEMBER'
              ? 'Hãy xin mã hoặc link mời từ trưởng nhóm, rồi nhập vào đây để tham gia.'
              : getErrorMessage(trip.error)
          }
          action={
            <div className="grid w-full gap-3">
              {code === 'NOT_TRIP_MEMBER' && <InlineJoinCode />}
              <Button asChild variant="outline">
                <Link to="/trips">
                  <ArrowLeft />
                  Về danh sách chuyến đi
                </Link>
              </Button>
            </div>
          }
        />
      </div>
    )
  }

  const data = trip.data
  const canEdit = roleAtLeast(data.myRole, 'EDITOR')
  const isOwner = data.myRole === 'OWNER'
  const officialRange = formatDateRange(data.startDate, data.endDate)
  const plannedRange = formatDateRange(data.plannedStartDate, data.plannedEndDate)

  const handleUpdate = async (body: TripRequest) => {
    await updateTrip.mutateAsync(body)
    setEditOpen(false)
    toast.success('Đã lưu thay đổi')
  }

  const handleDelete = () =>
    deleteTrip.mutate(undefined, {
      onSuccess: () => {
        toast.success('Đã xóa chuyến đi')
        navigate('/trips', { replace: true })
      },
      onError: (error) => toast.error(getErrorMessage(error)),
    })

  return (
    <div className="space-y-6">
      <TripCover
        coverImageUrl={data.coverImageUrl}
        seed={data.id}
        withOverlay
        className="-mx-4 border-border/60 shadow-raised sm:mx-0 sm:rounded-overlay sm:border"
      >
        <div className="flex min-h-60 flex-col justify-between gap-4 p-4 sm:min-h-72 sm:p-6">
          <div className="flex items-center justify-between">
            <Button
              asChild
              variant="secondary"
              size="icon"
              className="bg-white/90 text-foreground shadow-flat hover:bg-white"
              aria-label="Quay lại"
            >
              <Link to="/trips">
                <ArrowLeft />
              </Link>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="secondary"
                  size="icon"
                  className="bg-white/90 text-foreground shadow-flat hover:bg-white"
                  aria-label="Tùy chọn"
                >
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {canEdit && (
                  <DropdownMenuItem onSelect={() => setEditOpen(true)}>
                    <Pencil />
                    Sửa thông tin
                  </DropdownMenuItem>
                )}
                <TripMuteMenuItem tripId={data.id} />
                {isOwner && (
                  <DropdownMenuItem variant="destructive" onSelect={() => setDeleteOpen(true)}>
                    <Trash2 />
                    Xóa chuyến đi
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="min-w-0 space-y-2 text-white">
            <StatusBadge status={data.status} />
            <h1 className="line-clamp-3 text-2xl leading-tight font-bold break-words drop-shadow-md sm:text-3xl">
              {data.title}
            </h1>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-white/95 font-medium drop-shadow-sm">
              {data.destination && (
                <span className="flex min-w-0 max-w-full items-center gap-1.5">
                  <MapPin className="size-4 shrink-0" />
                  <span className="truncate">{data.destination}</span>
                </span>
              )}
              {(officialRange ?? plannedRange) && (
                <span className="flex items-center gap-1.5">
                  <CalendarDays className="size-4" />
                  {officialRange ?? `Dự kiến: ${plannedRange}`}
                </span>
              )}
            </div>
          </div>
        </div>
      </TripCover>

      <div className="flex justify-center">
        <CountdownLabel trip={data} className="px-4 py-1.5 text-base" />
      </div>

      <Tabs value={tab} onValueChange={changeTab}>
        <div className="sticky top-16 z-20 -mx-4 bg-background px-4 py-2 sm:-mx-6 sm:px-6">
          <div className="no-scrollbar scroll-fade-x overflow-x-auto">
            <TabsList
              ref={tabsListRef}
              className="h-auto border border-border/60 bg-card p-1.5 shadow-overlay *:data-[slot=tabs-trigger]:min-h-11"
            >
              <TabsTrigger value="overview">Tổng quan</TabsTrigger>
              <TabsTrigger value="availability">Lịch rảnh</TabsTrigger>
              <TabsTrigger value="itinerary">Lịch trình</TabsTrigger>
              <TabsTrigger value="polls">Ý tưởng</TabsTrigger>
              <TabsTrigger value="checklist">Chuẩn bị</TabsTrigger>
              <TabsTrigger value="expenses">Chi tiêu</TabsTrigger>
              <TabsTrigger value="rooms">Phòng</TabsTrigger>
              <TabsTrigger value="album">Album</TabsTrigger>
            </TabsList>
          </div>
        </div>

        <TabsContent value="overview" className="mt-4 grid gap-6 md:grid-cols-5">
          <div className="space-y-6 md:col-span-3">
            {data.description && (
              <Card>
                <CardHeader>
                  <CardTitle>Giới thiệu</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-line text-muted-foreground leading-relaxed">{data.description}</p>
                </CardContent>
              </Card>
            )}
            {user && (
              <MemberList tripId={data.id} members={data.members} currentUserId={user.id} myRole={data.myRole} />
            )}
          </div>
          <div className="md:col-span-2">
            {data.inviteCode && (
              <InviteShare
                tripId={data.id}
                tripTitle={data.title}
                inviteCode={data.inviteCode}
                canRegenerate={isOwner}
              />
            )}
          </div>
        </TabsContent>

        <TabsContent value="availability" className="mt-4">
          {user && (
            <AvailabilityTab
              tripId={data.id}
              myUserId={user.id}
              myRole={data.myRole}
              onEditTrip={() => setEditOpen(true)}
            />
          )}
        </TabsContent>

        <TabsContent value="itinerary" className="mt-4">
          <ItineraryTab
            tripId={data.id}
            canEdit={canEdit}
            onEditTrip={() => setEditOpen(true)}
            memberCount={data.members.length}
          />
        </TabsContent>

        <TabsContent value="polls" className="mt-4">
          {user && <IdeasTab tripId={data.id} myUserId={user.id} canCreatePoll={canEdit} members={data.members} />}
        </TabsContent>

        <TabsContent value="checklist" className="mt-4">
          {user && <ChecklistTab tripId={data.id} myUserId={user.id} canEdit={canEdit} members={data.members} />}
        </TabsContent>

        <TabsContent value="expenses" className="mt-4">
          {user && (
            <ExpensesTab
              tripId={data.id}
              tripTitle={data.title}
              myUserId={user.id}
              isOwner={isOwner}
              members={data.members}
            />
          )}
        </TabsContent>

        <TabsContent value="rooms" className="mt-4">
          {user && <RoomsTab tripId={data.id} myUserId={user.id} canEdit={canEdit} />}
        </TabsContent>

        <TabsContent value="album" className="mt-4">
          <AlbumTab tripId={data.id} canEdit={canEdit} />
        </TabsContent>
      </Tabs>

      <TripFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        trip={data}
        pending={updateTrip.isPending}
        onSubmit={handleUpdate}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Xóa chuyến đi này?"
        description={`"${data.title}" và toàn bộ thành viên sẽ bị xóa vĩnh viễn, không khôi phục được.`}
        confirmLabel="Xóa vĩnh viễn"
        destructive
        pending={deleteTrip.isPending}
        onConfirm={handleDelete}
      />
    </div>
  )
}

function TripDetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="-mx-4 h-60 sm:mx-0 sm:h-72 sm:rounded-overlay" />
      <div className="flex justify-center">
        <Skeleton className="h-10 w-44 rounded-full" />
      </div>
      <div className="grid gap-6 md:grid-cols-5">
        <div className="space-y-6 md:col-span-3">
          <Skeleton className="h-44 rounded-surface" />
          <Skeleton className="h-64 rounded-surface" />
        </div>
        <div className="md:col-span-2">
          <Skeleton className="h-56 rounded-surface" />
        </div>
      </div>
    </div>
  )
}

/** Tắt/bật mọi email của chuyến này cho riêng mình (kể cả đếm ngược). */
function TripMuteMenuItem({ tripId }: { tripId: number }) {
  const mute = useTripMute(tripId)
  const setMute = useSetTripMute(tripId)
  const muted = mute.data?.muted ?? false

  return (
    <DropdownMenuItem
      disabled={mute.isPending || setMute.isPending}
      onSelect={() =>
        setMute.mutate(!muted, {
          onSuccess: (result) =>
            toast.success(result.muted ? 'Đã tắt email của chuyến này' : 'Đã bật lại email của chuyến này'),
          onError: (error) => toast.error(getErrorMessage(error)),
        })
      }
    >
      {muted ? <Bell /> : <BellOff />}
      {muted ? 'Bật email chuyến này' : 'Tắt email chuyến này'}
    </DropdownMenuItem>
  )
}

/** Ô nhập mã mời ngay trên màn "chưa ở trong chuyến" (P3-TD-02): mã trơn hoặc link /join/…, /share/…. */
function InlineJoinCode() {
  const navigate = useNavigate()
  const [value, setValue] = useState('')
  const code = extractInviteCode(value)
  const invalid = value.trim() !== '' && !code

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (code) navigate(`/join/${code}`)
  }

  return (
    <form onSubmit={submit} className="grid gap-2 text-left">
      <div className="flex gap-2">
        <Input
          autoCapitalize="characters"
          autoComplete="off"
          aria-label="Mã mời"
          aria-invalid={invalid}
          aria-describedby={invalid ? 'trip-join-code-error' : undefined}
          placeholder="Mã mời hoặc link"
          className="font-mono uppercase"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        <Button type="submit" disabled={!code}>
          Tham gia
        </Button>
      </div>
      {invalid && (
        <p id="trip-join-code-error" role="alert" className="text-sm text-destructive">
          Mã chưa hợp lệ: mã gồm 8 ký tự, hoặc dán link /join/… hay /share/…
        </p>
      )}
    </form>
  )
}
