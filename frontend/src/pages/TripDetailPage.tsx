import { ArrowLeft, Bell, BellOff, CalendarDays, MapPin, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { AlbumTab } from '@/components/album/AlbumTab'
import { AvailabilityTab } from '@/components/availability/AvailabilityTab'
import { ChecklistTab } from '@/components/checklist/ChecklistTab'
import { ExpensesTab } from '@/components/expenses/ExpensesTab'
import { RoomsTab } from '@/components/rooms/RoomsTab'
import { ItineraryTab } from '@/components/itinerary/ItineraryTab'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { IdeasTab } from '@/components/IdeasTab'
import { CountdownLabel } from '@/components/CountdownLabel'
import { InviteShare } from '@/components/InviteShare'
import { MemberList } from '@/components/MemberList'
import { StatusBadge } from '@/components/StatusBadge'
import { TripCover } from '@/components/TripCover'
import { TripFormDialog } from '@/components/TripFormDialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuth } from '@/auth/useAuth'
import { useSetTripMute, useTripMute } from '@/hooks/useNotificationSettings'
import { useDeleteTrip, useTrip, useUpdateTrip } from '@/hooks/useTrips'
import { getErrorCode, getErrorMessage } from '@/lib/api'
import { formatDateRange } from '@/lib/date'
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
      <div className="mx-auto max-w-md space-y-4 py-16 text-center">
        <p className="text-5xl animate-float-slow">🗺️</p>
        <h1 className="text-xl font-bold">{title}</h1>
        <p className="text-muted-foreground">
          {code === 'NOT_TRIP_MEMBER'
            ? 'Hãy xin link mời từ trưởng nhóm để tham gia.'
            : getErrorMessage(trip.error)}
        </p>
        <Button asChild variant="outline">
          <Link to="/trips">
            <ArrowLeft />
            Về danh sách chuyến đi
          </Link>
        </Button>
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
        className="-mx-4 h-60 sm:mx-0 sm:h-72 sm:rounded-[32px] shadow-clay-card border border-border/60"
      >
        <div className="flex h-full flex-col justify-between p-4 sm:p-6">
          <div className="flex items-center justify-between">
              <Button
                asChild
                variant="secondary"
                size="icon"
                className="bg-white/90 hover:bg-white text-foreground shadow-clay-badge backdrop-blur-xs"
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
                        className="bg-white/90 hover:bg-white text-foreground shadow-clay-badge backdrop-blur-xs"
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
          <div className="space-y-2 text-white">
              <StatusBadge status={data.status} className="shadow-md" />
              <h1 className="text-2xl leading-tight font-bold drop-shadow-md sm:text-3xl">{data.title}</h1>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-white/95 font-medium drop-shadow-sm">
                {data.destination && (
                    <span className="flex items-center gap-1.5">
                      <MapPin className="size-4" />
                      {data.destination}
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
                <div className="rounded-full bg-card/90 backdrop-blur-xs px-5 py-2 shadow-clay-card border border-border/70 hover:scale-105 transition-transform duration-200">
                  <CountdownLabel trip={data} className="text-base" />
                </div>
              </div>

              <Tabs value={tab} onValueChange={changeTab}>
                    <div className="-mx-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
                      <TabsList className="bg-card/90 backdrop-blur-md shadow-clay-dock border border-border/60 p-1.5 h-12">
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

                        <TabsContent value="overview" className="mt-4 grid gap-6 md:grid-cols-5">
                          <div className="space-y-6 md:col-span-3 animate-cascade">
                            {data.description && (
              <Card className="rounded-[28px] shadow-clay-card border border-border/60 bg-card">
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
          <div className="md:col-span-2 animate-cascade">
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
                          <ItineraryTab tripId={data.id} canEdit={canEdit} />
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
                        <Skeleton className="-mx-4 h-60 sm:mx-0 sm:h-72 sm:rounded-[32px]" />
                        <div className="flex justify-center">
                          <Skeleton className="h-10 w-44 rounded-full" />
                        </div>
                        <div className="grid gap-6 md:grid-cols-5">
                          <div className="space-y-6 md:col-span-3">
                            <Skeleton className="h-44 rounded-[28px]" />
                            <Skeleton className="h-64 rounded-[28px]" />
                          </div>
                          <div className="md:col-span-2 animate-cascade">
                            <Skeleton className="h-56 rounded-[28px]" />
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
