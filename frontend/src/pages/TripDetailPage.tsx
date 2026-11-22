import { ArrowLeft, CalendarDays, MapPin, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { AvailabilityTab } from '@/components/availability/AvailabilityTab'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { CountdownLabel } from '@/components/CountdownLabel'
import { InviteShare } from '@/components/InviteShare'
import { MemberList } from '@/components/MemberList'
import { StatusBadge } from '@/components/StatusBadge'
import { TripCover } from '@/components/TripCover'
import { TripFormDialog } from '@/components/TripFormDialog'
import { Badge } from '@/components/ui/badge'
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
import { useDeleteTrip, useTrip, useUpdateTrip } from '@/hooks/useTrips'
import { getErrorCode, getErrorMessage } from '@/lib/api'
import { formatDateRange } from '@/lib/date'
import { roleAtLeast } from '@/lib/labels'
import type { TripRequest } from '@/types/trip'

/** Các tab của phase sau: hiện trước để cả nhóm biết sắp có gì. */
const UPCOMING_TABS = [
  { value: 'itinerary', label: 'Lịch trình' },
  { value: 'expenses', label: 'Chi tiêu' },
  { value: 'album', label: 'Album' },
]

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
        <p className="text-5xl">🗺️</p>
        <h1 className="text-xl font-semibold">{title}</h1>
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
        className="-mx-4 h-56 sm:mx-0 sm:h-64 sm:rounded-3xl"
      >
        <div className="flex h-full flex-col justify-between p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <Button asChild variant="secondary" size="icon" className="bg-white/80 backdrop-blur" aria-label="Quay lại">
              <Link to="/trips">
                <ArrowLeft />
              </Link>
            </Button>
            {canEdit && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="secondary" size="icon" className="bg-white/80 backdrop-blur" aria-label="Tùy chọn">
                    <MoreHorizontal />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={() => setEditOpen(true)}>
                    <Pencil />
                    Sửa thông tin
                  </DropdownMenuItem>
                  {isOwner && (
                    <DropdownMenuItem variant="destructive" onSelect={() => setDeleteOpen(true)}>
                      <Trash2 />
                      Xóa chuyến đi
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
          <div className="space-y-2 text-white">
            <StatusBadge status={data.status} className="shadow-sm" />
            <h1 className="text-2xl leading-tight font-bold drop-shadow sm:text-3xl">{data.title}</h1>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-white/90">
              {data.destination && (
                <span className="flex items-center gap-1">
                  <MapPin className="size-4" />
                  {data.destination}
                </span>
              )}
              {(officialRange ?? plannedRange) && (
                <span className="flex items-center gap-1">
                  <CalendarDays className="size-4" />
                  {officialRange ?? `Dự kiến ${plannedRange}`}
                </span>
              )}
            </div>
          </div>
        </div>
      </TripCover>

      <div className="flex justify-center">
        <div className="rounded-full bg-card px-4 py-2 shadow-sm ring-1 ring-border">
          <CountdownLabel trip={data} className="text-base" />
        </div>
      </div>

      <Tabs defaultValue="overview">
        <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <TabsList>
            <TabsTrigger value="overview">Tổng quan</TabsTrigger>
            <TabsTrigger value="availability">Lịch rảnh</TabsTrigger>
            {UPCOMING_TABS.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value} disabled className="gap-1.5">
                {tab.label}
                <Badge variant="secondary" className="px-1.5 text-[10px]">
                  Sắp có
                </Badge>
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="overview" className="mt-4 grid gap-4 md:grid-cols-5">
          <div className="space-y-4 md:col-span-3">
            {data.description && (
              <Card>
                <CardHeader>
                  <CardTitle>Giới thiệu</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-line text-muted-foreground">{data.description}</p>
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
      <Skeleton className="-mx-4 h-56 rounded-none sm:mx-0 sm:h-64 sm:rounded-3xl" />
      <Skeleton className="mx-auto h-10 w-48 rounded-full" />
      <div className="grid gap-4 md:grid-cols-5">
        <Skeleton className="h-64 md:col-span-3" />
        <Skeleton className="h-64 md:col-span-2" />
      </div>
    </div>
  )
}
