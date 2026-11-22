import { BedDouble, DoorOpen, LogOut, MoreVertical, Pencil, Plus, RotateCw, Trash2, UserPlus } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { FormField } from '@/components/FormField'
import { UserAvatar } from '@/components/UserAvatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  useAssignRoom,
  useCreateRoom,
  useDeleteRoom,
  useRooms,
  useUnassignRoom,
  useUpdateRoom,
} from '@/hooks/useRooms'
import { getErrorMessage } from '@/lib/api'
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

  if (rooms.isPending) return <Skeleton className="h-64 rounded-3xl" />
  if (rooms.isError) {
    return (
      <div className="rounded-3xl border border-dashed p-8 text-center">
        <p className="text-muted-foreground">{getErrorMessage(rooms.error)}</p>
        <Button variant="outline" className="mt-4" onClick={() => rooms.refetch()}>
          <RotateCw />
          Thử lại
        </Button>
      </div>
    )
  }

  const data = rooms.data
  const onError = (e: unknown) => toast.error(getErrorMessage(e))
  const myRoom = data.rooms.find((r) => r.members.some((m) => m.userId === myUserId))
  const move = (roomId: number, member: MemberPreview) => assign.mutate({ roomId, userId: member.userId }, { onError })

  const submitRoom = async (body: RoomRequest) => {
    if (form?.room) await update.mutateAsync({ roomId: form.room.id, body })
    else await create.mutateAsync(body)
    setForm(null)
  }

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {myRoom ? (
            <>
              Bạn ở <b className="text-foreground">{myRoom.name}</b>
            </>
          ) : (
            'Bạn chưa có phòng, chọn 1 phòng bên dưới nhé.'
          )}
        </p>
        {canEdit && (
          <Button size="sm" onClick={() => setForm({})}>
            <Plus />
            Thêm phòng
          </Button>
        )}
      </div>

      {data.rooms.length === 0 ? (
        <div className="rounded-3xl border-2 border-dashed border-rose-200 bg-white/60 px-6 py-12 text-center">
          <BedDouble className="mx-auto size-12 text-rose-300" />
          <h2 className="mt-4 text-lg font-semibold">Chưa có phòng nào</h2>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
            {canEdit ? 'Thêm các phòng của homestay/khách sạn để mọi người chọn chỗ ngủ.' : 'Trưởng nhóm sẽ thêm phòng sau.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {data.rooms.map((room) => {
            const full = room.capacity !== null && room.members.length >= room.capacity
            const amIn = room.members.some((m) => m.userId === myUserId)
            return (
              <Card key={room.id} className={cn(amIn && 'ring-2 ring-primary/50')}>
                <CardHeader className="flex flex-row items-start justify-between gap-2">
                  <div className="min-w-0">
                    <CardTitle className="flex items-center gap-2">
                      <DoorOpen className="size-4 text-muted-foreground" />
                      <span className="truncate">{room.name}</span>
                    </CardTitle>
                    <p className={cn('mt-1 text-xs', full ? 'text-rose-600' : 'text-muted-foreground')}>
                      {room.members.length}
                      {room.capacity !== null ? `/${room.capacity}` : ''} người{full ? ' · đã đủ' : ''}
                      {room.note ? ` · ${room.note}` : ''}
                    </p>
                  </div>
                  {canEdit && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm" aria-label={`Tùy chọn ${room.name}`}>
                          <MoreVertical />
                        </Button>
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
                <CardContent className="grid gap-2">
                  {room.members.length === 0 && <p className="text-sm text-muted-foreground">Còn trống</p>}
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
                  {!amIn && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={full || assign.isPending}
                      onClick={() =>
                        assign.mutate(
                          { roomId: room.id, userId: myUserId },
                          { onSuccess: () => toast.success(`Bạn đã vào ${room.name}`), onError },
                        )
                      }
                    >
                      {full ? 'Phòng đã đủ người' : myRoom ? 'Chuyển sang phòng này' : 'Vào phòng này'}
                    </Button>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {data.unassigned.length > 0 && data.rooms.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Chưa có phòng ({data.unassigned.length})</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            {data.unassigned.map((m) => (
              <div key={m.userId} className="flex items-center gap-2 text-sm">
                <UserAvatar userId={m.userId} name={m.displayName} avatarUrl={m.avatarUrl} size="sm" />
                <span className="min-w-0 flex-1 truncate">{m.userId === myUserId ? 'Bạn' : m.displayName}</span>
                {canEdit && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
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
              </div>
            ))}
          </CardContent>
        </Card>
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
    <div className="flex items-center gap-2 text-sm">
      <UserAvatar userId={member.userId} name={member.displayName} avatarUrl={member.avatarUrl} size="sm" />
      <span className={cn('min-w-0 flex-1 truncate', isMe && 'font-semibold')}>{isMe ? 'Bạn' : member.displayName}</span>
      {canManage && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-xs" aria-label={`Tùy chọn ${member.displayName}`}>
              <MoreVertical />
            </Button>
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
        {open && <RoomForm key={room?.id ?? 'new'} room={room} pending={pending} onSubmit={onSubmit} />}
      </DialogContent>
    </Dialog>
  )
}

function RoomForm({
  room,
  pending,
  onSubmit,
}: {
  room?: RoomResponse
  pending: boolean
  onSubmit: (body: RoomRequest) => Promise<void>
}) {
  const [name, setName] = useState(room?.name ?? '')
  const [capacity, setCapacity] = useState(room?.capacity ? String(room.capacity) : '')
  const [note, setNote] = useState(room?.note ?? '')

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!name.trim()) return
    try {
      await onSubmit({ name: name.trim(), capacity: capacity ? Number(capacity) : null, note: note.trim() || null })
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      <DialogHeader>
        <DialogTitle>{room ? 'Sửa phòng' : 'Thêm phòng'}</DialogTitle>
      </DialogHeader>
      <FormField id="room-name" label="Tên phòng">
        <Input id="room-name" autoFocus maxLength={100} placeholder="VD: Phòng 1 – giường đôi" value={name} onChange={(e) => setName(e.target.value)} />
      </FormField>
      <FormField id="room-capacity" label="Số người tối đa" optional>
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
      <FormField id="room-note" label="Ghi chú" optional>
        <Input id="room-note" maxLength={300} placeholder="VD: View biển, tầng 2" value={note} onChange={(e) => setNote(e.target.value)} />
      </FormField>
      <DialogFooter>
        <Button type="submit" disabled={pending || !name.trim()}>
          {pending ? 'Đang lưu…' : 'Lưu'}
        </Button>
      </DialogFooter>
    </form>
  )
}
