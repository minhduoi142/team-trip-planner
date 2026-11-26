import { BedDouble, DoorOpen, LogOut, Pencil, Plus, Trash2, UserPlus } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { FormField } from '@/components/FormField'
import { UserAvatar } from '@/components/UserAvatar'
import { FieldError, RowMenuButton } from '@/components/common/layout'
import { EmptyState, TabErrorState, TabSkeleton } from '@/components/common/states'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { useAssignRoom, useCreateRoom, useDeleteRoom, useRooms, useUnassignRoom, useUpdateRoom } from '@/hooks/useRooms'
import { getErrorCode, getErrorMessage, getFieldErrors } from '@/lib/api'
import { cn } from '@/lib/utils'
import type { RoomRequest, RoomResponse } from '@/types/room'
import type { MemberPreview } from '@/types/trip'

interface RoomsTabProps {
  tripId: number
  myUserId: number
  canEdit: boolean
}

export function RoomsTab({ tripId, myUserId, canEdit }: RoomsTabProps) {
  const rooms = useRooms(tripId)
  const create = useCreateRoom(tripId)
  const update = useUpdateRoom(tripId)
  const remove = useDeleteRoom(tripId)
  const assign = useAssignRoom(tripId)
  const unassign = useUnassignRoom(tripId)
  const [form, setForm] = useState<{ room?: RoomResponse } | null>(null)
  const [toDelete, setToDelete] = useState<RoomResponse | null>(null)

  if (rooms.isPending) return <TabSkeleton variant="list" rows={3} />
  if (rooms.isError) return <TabErrorState error={rooms.error} onRetry={() => rooms.refetch()} />

  const data = rooms.data
  const onError = (e: unknown) => toast.error(getErrorMessage(e))
  const myRoom = data.rooms.find((r) => r.members.some((m) => m.userId === myUserId))
  const move = (roomId: number, member: MemberPreview) => assign.mutate({ roomId, userId: member.userId }, { onError })
  const joinRoom = (room: RoomResponse) =>
    assign.mutate(
      { roomId: room.id, userId: myUserId },
      { onSuccess: () => toast.success(`Bạn đã vào ${room.name}`), onError },
    )

  const submitRoom = async (body: RoomRequest) => {
    if (form?.room) await update.mutateAsync({ roomId: form.room.id, body })
    else await create.mutateAsync(body)
    setForm(null)
  }

  return (
    <div className="grid gap-4">
      {data.rooms.length === 0 ? (
        <EmptyState
          icon={BedDouble}
          title="Chưa có phòng nào"
          description={
            canEdit
              ? 'Thêm các phòng của homestay/khách sạn để mọi người chọn chỗ ngủ.'
              : 'Trưởng nhóm sẽ thêm phòng sau.'
          }
          action={
            canEdit && (
              <Button onClick={() => setForm({})}>
                <Plus />
                Thêm phòng
              </Button>
            )
          }
        />
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="min-w-0 text-sm text-muted-foreground">
              {myRoom ? (
                <>
                  Bạn ở <b className="font-semibold break-words text-foreground">{myRoom.name}</b>
                </>
              ) : (
                'Bạn chưa có phòng, chọn một phòng bên dưới.'
              )}
            </p>
            {canEdit && (
              <Button size="sm" variant="outline" onClick={() => setForm({})}>
                <Plus />
                Thêm phòng
              </Button>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {data.rooms.map((room) => {
              const full = room.capacity !== null && room.members.length >= room.capacity
              const amIn = room.members.some((m) => m.userId === myUserId)
              return (
                <Card key={room.id} className={cn(amIn && 'border-primary')}>
                  <CardHeader className="flex flex-row items-start justify-between gap-2 p-5 pb-3">
                    <div className="min-w-0">
                      <CardTitle className="flex items-center gap-2 text-base font-bold">
                        <DoorOpen className="size-4.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                        <span className="truncate">{room.name}</span>
                      </CardTitle>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        {amIn && <Badge>Phòng của bạn</Badge>}
                        <Badge
                          variant="secondary"
                          className={full ? 'bg-warning-soft text-warning-soft-foreground' : 'bg-muted text-foreground'}
                        >
                          {room.members.length}
                          {room.capacity !== null ? `/${room.capacity}` : ''} người{full ? ' · đã đủ' : ''}
                        </Badge>
                        {room.note && (
                          <span className="max-w-44 truncate text-xs text-muted-foreground">· {room.note}</span>
                        )}
                      </div>
                    </div>
                    {canEdit && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <RowMenuButton label={`Tùy chọn cho ${room.name}`} />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => setForm({ room })}>
                            <Pencil />
                            Sửa phòng
                          </DropdownMenuItem>
                          <DropdownMenuItem variant="destructive" onSelect={() => setToDelete(room)}>
                            <Trash2 />
                            Xóa phòng
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </CardHeader>
                  <CardContent className="grid gap-1 p-5 pt-0">
                    {room.members.length === 0 && (
                      <p className="rounded-item border border-dashed border-border py-3 text-center text-sm text-muted-foreground">
                        Còn trống chỗ
                      </p>
                    )}
                    {room.members.map((m) => (
                      <MemberRow
                        key={m.userId}
                        member={m}
                        isMe={m.userId === myUserId}
                        canManage={canEdit || m.userId === myUserId}
                        rooms={data.rooms.filter((r) => r.id !== room.id)}
                        canMove={canEdit}
                        onMove={(roomId) => move(roomId, m)}
                        onLeave={() => unassign.mutate({ roomId: room.id, userId: m.userId }, { onError })}
                      />
                    ))}
                    {!amIn &&
                      !full &&
                      (myRoom ? (
                        <Button
                          variant="link"
                          size="sm"
                          disabled={assign.isPending}
                          className="mt-1 justify-self-start px-0"
                          onClick={() => joinRoom(room)}
                        >
                          Chuyển sang đây
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          disabled={assign.isPending}
                          className="mt-2 w-full"
                          onClick={() => joinRoom(room)}
                        >
                          Vào phòng này
                        </Button>
                      ))}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </>
      )}

      {data.unassigned.length > 0 && data.rooms.length > 0 && (
        <section className="grid gap-2 rounded-surface border border-border bg-muted/40 p-5">
          <h3 className="text-base font-bold">Chưa có phòng ({data.unassigned.length})</h3>
          <ul className="grid divide-y divide-border/60">
            {data.unassigned.map((m) => (
              <li key={m.userId} className="flex min-h-12 items-center gap-2 py-1.5 text-sm">
                <UserAvatar userId={m.userId} name={m.displayName} avatarUrl={m.avatarUrl} size="sm" />
                <span className="min-w-0 flex-1 truncate font-medium">
                  {m.userId === myUserId ? 'Bạn' : m.displayName}
                </span>
                {canEdit && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" aria-label={`Xếp ${m.displayName} vào phòng`}>
                        <UserPlus />
                        Xếp vào…
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {data.rooms.map((r) => (
                        <DropdownMenuItem key={r.id} onSelect={() => move(r.id, m)}>
                          {r.name}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <RoomFormDialog
        open={form !== null}
        room={form?.room}
        pending={create.isPending || update.isPending}
        onOpenChange={(open) => !open && setForm(null)}
        onSubmit={submitRoom}
      />
      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(open) => !open && setToDelete(null)}
        title={`Xóa ${toDelete?.name ?? 'phòng'}?`}
        description="Những người trong phòng sẽ về mục 'Chưa có phòng'."
        confirmLabel="Xóa phòng"
        destructive
        pending={remove.isPending}
        onConfirm={() => toDelete && remove.mutate(toDelete.id, { onSuccess: () => setToDelete(null), onError })}
      />
    </div>
  )
}

function MemberRow({
  member,
  isMe,
  canManage,
  canMove,
  rooms,
  onMove,
  onLeave,
}: {
  member: MemberPreview
  isMe: boolean
  canManage: boolean
  canMove: boolean
  rooms: RoomResponse[]
  onMove: (roomId: number) => void
  onLeave: () => void
}) {
  return (
    <div className="flex min-h-11 items-center gap-2 text-sm">
      <UserAvatar userId={member.userId} name={member.displayName} avatarUrl={member.avatarUrl} size="sm" />
      <span className={cn('min-w-0 flex-1 truncate font-medium', isMe && 'font-semibold text-primary-strong')}>
        {isMe ? 'Bạn' : member.displayName}
      </span>
      {canManage && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <RowMenuButton label={`Tùy chọn cho ${isMe ? 'bạn' : member.displayName}`} />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {canMove && rooms.length > 0 && (
              <>
                <DropdownMenuLabel>Chuyển sang</DropdownMenuLabel>
                {rooms.map((r) => (
                  <DropdownMenuItem key={r.id} onSelect={() => onMove(r.id)}>
                    {r.name}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem onSelect={onLeave}>
              <LogOut />
              Ra khỏi phòng
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  )
}

function RoomFormDialog({
  open,
  room,
  pending,
  onOpenChange,
  onSubmit,
}: {
  open: boolean
  room?: RoomResponse
  pending: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (body: RoomRequest) => Promise<void>
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        {open && (
          <RoomForm
            key={room?.id ?? 'new'}
            room={room}
            pending={pending}
            onSubmit={onSubmit}
            onCancel={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function RoomForm({
  room,
  pending,
  onSubmit,
  onCancel,
}: {
  room?: RoomResponse
  pending: boolean
  onSubmit: (body: RoomRequest) => Promise<void>
  onCancel: () => void
}) {
  const [name, setName] = useState(room?.name ?? '')
  const [capacity, setCapacity] = useState(room?.capacity ? String(room.capacity) : '')
  const [note, setNote] = useState(room?.note ?? '')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setFormError(null)
    if (!name.trim()) {
      setErrors({ name: 'Nhập tên phòng' })
      return
    }
    setErrors({})
    try {
      await onSubmit({ name: name.trim(), capacity: capacity ? Number(capacity) : null, note: note.trim() || null })
    } catch (error) {
      const fieldErrors = { ...getFieldErrors(error) }
      if (getErrorCode(error) === 'DUPLICATE_ROOM') fieldErrors.name ??= getErrorMessage(error)
      if (Object.keys(fieldErrors).length > 0) setErrors(fieldErrors)
      else setFormError(getErrorMessage(error))
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-4" noValidate>
      <DialogHeader>
        <DialogTitle>{room ? 'Sửa phòng' : 'Thêm phòng'}</DialogTitle>
      </DialogHeader>
      <FormField id="room-name" label="Tên phòng" error={errors.name}>
        <Input
          id="room-name"
          autoFocus
          maxLength={100}
          placeholder="VD: Phòng 1 – giường đôi"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </FormField>
      <FormField id="room-capacity" label="Số người tối đa" optional error={errors.capacity}>
        <Input
          id="room-capacity"
          type="number"
          min={1}
          max={30}
          inputMode="numeric"
          value={capacity}
          onChange={(e) => setCapacity(e.target.value)}
        />
      </FormField>
      <FormField id="room-note" label="Ghi chú" optional error={errors.note}>
        <Input
          id="room-note"
          maxLength={300}
          placeholder="VD: View biển, tầng 2"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </FormField>
      {formError && <FieldError>{formError}</FieldError>}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} disabled={pending}>
          Hủy
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? 'Đang lưu…' : 'Lưu'}
        </Button>
      </DialogFooter>
    </form>
  )
}
