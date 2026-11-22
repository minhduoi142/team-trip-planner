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
        <div className="rounded-3xl border-2 border-dashed border-rose-200/80 bg-card/80 p-8 text-center shadow-clay-card">
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
  const move = (roomId: number, member: MemberPreview) => assign.mutate({roomId, userId: member.userId }, {onError})

  const submitRoom = async (body: RoomRequest) => {
    if (form?.room) await update.mutateAsync({roomId: form.room.id, body })
        else await create.mutateAsync(body)
        setForm(null)
  }

        return (
        <div className="grid gap-4">
          <div className="flex items-center justify-between gap-2">
              <div className="rounded-full border border-white/80 bg-card/90 px-4 py-1.5 text-xs sm:text-sm font-semibold shadow-clay-badge text-foreground">
                {myRoom ? (
                  <>
                    Bạn ở <b className="text-primary font-bold">{myRoom.name}</b>
                  </>
                ) : (
                  'Bạn chưa có phòng, chọn 1 phòng bên dưới nhé.'
                )}
          </div>
          {canEdit && (
              <Button size="sm" onClick={() => setForm({})} className="rounded-full shadow-clay-btn-primary">
                <Plus className="size-3.5" />
                Thêm phòng
              </Button>
        )}
            </div>

      {data.rooms.length === 0 ? (
              <div className="rounded-[28px] border-2 border-dashed border-rose-200 bg-card/60 px-6 py-12 text-center shadow-clay-card">
                <BedDouble className="mx-auto size-12 text-rose-300 animate-float-slow" />
                <h2 className="mt-4 text-lg font-bold text-foreground">Chưa có phòng nào</h2>
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
                        <Card
                          key={room.id}
                          className={cn(
                            'rounded-[28px] border-2 border-white/80 bg-card/95 shadow-clay-card transition-all duration-300 hover:shadow-clay-card-hover',
                            amIn && 'ring-2 ring-primary border-primary/50 bg-gradient-to-br from-rose-50/50 via-card to-card',
                          )}
                        >
                          <CardHeader className="flex flex-row items-start justify-between gap-2 p-5 pb-3">
                            <div className="min-w-0">
                                <CardTitle className="flex items-center gap-2 text-base font-bold text-foreground">
                                  <DoorOpen className="size-4.5 text-primary" />
                                  <span className="truncate">{room.name}</span>
                                </CardTitle>
                                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                  <span
                                    className={cn(
                                      'rounded-full px-2.5 py-0.5 text-xs font-bold border shadow-clay-badge',
                                      full
                                        ? 'border-rose-300 bg-rose-100/90 text-rose-800'
                                        : 'border-emerald-300 bg-emerald-100/90 text-emerald-800',
                                    )}
                                  >
                                    {room.members.length}
                                    {room.capacity !== null ? `/${room.capacity}` : ''} người{full ? ' · đã đủ' : ''}
                                  </span>
                                  {room.note && (
                                    <span className="text-xs text-muted-foreground font-medium truncate max-w-44">
                                      · {room.note}
                                    </span>
                                  )}
                                </div>
                            </div>
                            {canEdit && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon-sm"
                                      aria-label={`Tùy chọn ${room.name}`}
                                      className="rounded-full border border-white/70 bg-white/60 shadow-clay-badge hover:bg-white"
                                    >
                                      <MoreVertical className="size-3.5" />
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
                            <CardContent className="grid gap-2.5 p-5 pt-0">
                              {room.members.length === 0 && (
                                <p className="rounded-xl border border-dashed border-border/70 bg-muted/20 py-3 text-center text-xs font-medium text-muted-foreground">
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
                              {!amIn && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={full || assign.isPending}
                                  className="mt-1 w-full rounded-full border-2 border-rose-200 bg-rose-50/80 font-bold text-rose-700 shadow-clay-card hover:bg-rose-100 hover:shadow-clay-card-hover hover:-translate-y-0.5 active:translate-y-0.5"
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
                            <Card className="rounded-[28px] border-2 border-white/80 bg-muted/30 shadow-clay-sunken">
                              <CardHeader className="p-5 pb-3">
                                <CardTitle className="text-base font-bold text-foreground">
                                  Chưa có phòng ({data.unassigned.length})
                                </CardTitle>
                              </CardHeader>
                                <CardContent className="grid gap-2 p-5 pt-0">
                                  {data.unassigned.map((m) => (
                                      <div key={m.userId} className="flex items-center gap-2 rounded-2xl border border-white/80 bg-card/90 px-3.5 py-2 text-sm shadow-clay-badge">
                                        <UserAvatar userId={m.userId} name={m.displayName} avatarUrl={m.avatarUrl} size="sm" />
                                        <span className="min-w-0 flex-1 truncate font-semibold text-foreground">{m.userId === myUserId ? 'Bạn' : m.displayName}</span>
                                        {canEdit && (
                                          <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="sm" className="rounded-full shadow-clay-badge">
                                                  <UserPlus className="size-3.5" />
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
                                <div className="flex items-center gap-2 rounded-2xl border border-white/70 bg-card/80 px-3 py-2 text-sm shadow-clay-badge">
                                  <UserAvatar userId={member.userId} name={member.displayName} avatarUrl={member.avatarUrl} size="sm" />
                                  <span className={cn('min-w-0 flex-1 truncate text-xs font-semibold text-foreground', isMe && 'font-bold text-primary')}>{isMe ? 'Bạn' : member.displayName}</span>
                                  {canManage && (
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                          <Button variant="ghost" size="icon-xs" aria-label={`Tùy chọn ${member.displayName}`} className="rounded-full hover:bg-muted">
                                            <MoreVertical className="size-3" />
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
                                    room ?: RoomResponse
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
