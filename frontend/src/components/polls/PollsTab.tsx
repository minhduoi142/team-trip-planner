import { Check, Lock, MapPin, MoreVertical, Plus, RotateCw, Trash2, Trophy, Undo2, Vote, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { UserAvatar } from '@/components/UserAvatar'
import { AvatarGroup } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  useAddPollOption,
  useClosePoll,
  useCreatePoll,
  useDeletePoll,
  useDeletePollOption,
  usePolls,
  useReopenPoll,
  useToggleVote,
} from '@/hooks/usePolls'
import { getErrorMessage } from '@/lib/api'
import { mapsHref } from '@/lib/tripContent'
import { cn } from '@/lib/utils'
import type { PollResponse } from '@/types/poll'
import type { TripMemberResponse } from '@/types/trip'
import { ClosePollDialog } from './ClosePollDialog'

interface PollsTabProps {
  tripId: number
  myUserId: number
  canCreate: boolean
  members: TripMemberResponse[]
}

export function PollsTab({ tripId, myUserId, canCreate, members }: PollsTabProps) {
  const polls = usePolls(tripId)
  const create = useCreatePoll(tripId)
  const close = useClosePoll(tripId)
  const [title, setTitle] = useState('')
  const [toClose, setToClose] = useState<PollResponse | null>(null)

  if (polls.isPending) return <Skeleton className="h-64 rounded-3xl" />
  if (polls.isError) {
    return (
      <div className="rounded-3xl border border-dashed p-8 text-center">
        <p className="text-muted-foreground">{getErrorMessage(polls.error)}</p>
        <Button variant="outline" className="mt-4" onClick={() => polls.refetch()}>
          <RotateCw />
          Thử lại
        </Button>
      </div>
    )
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!title.trim()) return
    create.mutate(
      { title: title.trim(), options: null },
      { onSuccess: () => setTitle(''), onError: (e) => toast.error(getErrorMessage(e)) },
    )
  }

  return (
    <div className="grid gap-4">
      {canCreate && (
        <form onSubmit={submit} className="flex gap-2">
          <Input
            placeholder="Hỏi cả nhóm… (VD: Tối ngày 2 ăn gì?)"
            maxLength={150}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            aria-label="Câu hỏi bình chọn"
          />
          <Button type="submit" disabled={!title.trim() || create.isPending}>
            <Vote />
            Tạo
          </Button>
        </form>
      )}

      {polls.data.polls.length === 0 ? (
        <div className="rounded-3xl border-2 border-dashed border-rose-200 bg-white/60 px-6 py-12 text-center">
          <p className="text-5xl">🗳️</p>
          <h2 className="mt-4 text-lg font-semibold">Chưa có bình chọn nào</h2>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
            {canCreate ? 'Phân vân ăn gì, đi đâu? Tạo bình chọn để cả nhóm vote nhé!' : 'Khi có bình chọn, bạn sẽ thấy ở đây.'}
          </p>
        </div>
      ) : (
        polls.data.polls.map((poll) => (
          <PollCard
            key={poll.id}
            tripId={tripId}
            poll={poll}
            myUserId={myUserId}
            members={members}
            onClose={() => setToClose(poll)}
          />
        ))
      )}

      <ClosePollDialog
        tripId={tripId}
        poll={toClose}
        pending={close.isPending}
        onOpenChange={(open) => !open && setToClose(null)}
        onSubmit={async (body) => {
          if (!toClose) return
          await close.mutateAsync({ pollId: toClose.id, body })
          setToClose(null)
          toast.success(body.addToItinerary ? 'Đã chốt và thêm vào lịch trình 🎉' : 'Đã chốt bình chọn')
        }}
      />
    </div>
  )
}

function PollCard({
  tripId,
  poll,
  myUserId,
  members,
  onClose,
}: {
  tripId: number
  poll: PollResponse
  myUserId: number
  members: TripMemberResponse[]
  onClose: () => void
}) {
  const toggle = useToggleVote(tripId, myUserId)
  const addOption = useAddPollOption(tripId)
  const deleteOption = useDeletePollOption(tripId)
  const reopen = useReopenPoll(tripId)
  const remove = useDeletePoll(tripId)
  const [name, setName] = useState('')
  const [mapsUrl, setMapsUrl] = useState('')
  const [showMaps, setShowMaps] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const membersById = new Map(members.map((m) => [m.userId, m]))
  const maxVotes = Math.max(1, ...poll.options.map((o) => o.voteCount))
  const onError = (e: unknown) => toast.error(getErrorMessage(e))

  const submitOption = (event: FormEvent) => {
    event.preventDefault()
    if (!name.trim()) return
    addOption.mutate(
      { pollId: poll.id, body: { name: name.trim(), mapsUrl: mapsUrl.trim() || null, note: null } },
      {
        onSuccess: () => {
          setName('')
          setMapsUrl('')
          setShowMaps(false)
        },
        onError,
      },
    )
  }

  return (
    <Card className={cn(poll.closed && 'bg-muted/40')}>
      <CardHeader className="flex flex-row items-start justify-between gap-2">
        <div className="min-w-0">
          <CardTitle className="flex items-center gap-2">
            {poll.closed && <Lock className="size-4 text-muted-foreground" />}
            {poll.title}
          </CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            {poll.createdByName ? `${poll.createdByName} tạo` : 'Bình chọn'} · chọn được nhiều lựa chọn
          </p>
        </div>
        {poll.canManage && (
          <div className="flex shrink-0 items-center gap-1">
            {!poll.closed && poll.options.length > 0 && (
              <Button size="sm" onClick={onClose}>
                <Trophy />
                Chốt
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm" aria-label="Tùy chọn bình chọn">
                  <MoreVertical />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {poll.closed && (
                  <DropdownMenuItem onSelect={() => reopen.mutate(poll.id, { onError })}>
                    <Undo2 />
                    Mở lại
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onSelect={() => setConfirmDelete(true)}>
                  <Trash2 />
                  Xóa bình chọn
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </CardHeader>
      <CardContent className="grid gap-2">
        {poll.options.length === 0 && (
          <p className="text-sm text-muted-foreground">Chưa có lựa chọn nào, thêm đề xuất của bạn bên dưới nhé.</p>
        )}
        {poll.options.map((o) => {
          const winner = poll.winningOptionId === o.id
          const href = mapsHref(o.mapsUrl, null)
          return (
            <div
              key={o.id}
              className={cn(
                'relative overflow-hidden rounded-2xl ring-1 ring-border',
                winner && 'ring-2 ring-amber-400',
              )}
            >
              <div
                className={cn('absolute inset-y-0 left-0 transition-all', winner ? 'bg-amber-100' : 'bg-rose-100/70')}
                style={{ width: `${(o.voteCount / maxVotes) * 100}%` }}
                aria-hidden
              />
              <div className="relative flex items-center gap-3 px-3 py-2.5">
                <button
                  type="button"
                  disabled={poll.closed}
                  aria-pressed={o.votedByMe}
                  aria-label={o.votedByMe ? `Bỏ vote ${o.name}` : `Vote ${o.name}`}
                  onClick={() => toggle.mutate({ optionId: o.id, vote: !o.votedByMe }, { onError })}
                  className={cn(
                    'flex size-6 shrink-0 items-center justify-center rounded-md border-2 transition',
                    o.votedByMe ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/40 bg-background',
                    poll.closed && 'opacity-60',
                  )}
                >
                  {o.votedByMe && <Check className="size-4" strokeWidth={3} />}
                </button>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 font-medium">
                    {winner && <Trophy className="size-4 shrink-0 text-amber-500" />}
                    <span className="truncate">{o.name}</span>
                    {href && (
                      <a href={href} target="_blank" rel="noreferrer" aria-label="Xem trên Google Maps" className="text-primary">
                        <MapPin className="size-3.5" />
                      </a>
                    )}
                  </p>
                  {o.createdByName && <p className="text-xs text-muted-foreground">{o.createdByName} đề xuất</p>}
                </div>
                <AvatarGroup>
                  {o.voterIds.slice(0, 4).map((id) => {
                    const m = membersById.get(id)
                    return m ? <UserAvatar key={id} userId={id} name={m.displayName} avatarUrl={m.avatarUrl} size="sm" /> : null
                  })}
                </AvatarGroup>
                <span className="w-6 text-right text-sm font-semibold">{o.voteCount}</span>
                {o.canDelete && (
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    aria-label={`Xóa ${o.name}`}
                    onClick={() => deleteOption.mutate(o.id, { onError })}
                  >
                    <X />
                  </Button>
                )}
              </div>
            </div>
          )
        })}

        {!poll.closed && (
          <form onSubmit={submitOption} className="mt-1 grid gap-2">
            <div className="flex gap-2">
              <Input
                placeholder="Thêm lựa chọn…"
                maxLength={150}
                value={name}
                onChange={(e) => setName(e.target.value)}
                aria-label="Tên lựa chọn mới"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Thêm link Google Maps"
                aria-pressed={showMaps}
                onClick={() => setShowMaps((v) => !v)}
              >
                <MapPin />
              </Button>
              <Button type="submit" size="icon" aria-label="Thêm" disabled={!name.trim() || addOption.isPending}>
                <Plus />
              </Button>
            </div>
            {showMaps && (
              <Input
                placeholder="Link Google Maps (không bắt buộc)"
                inputMode="url"
                value={mapsUrl}
                onChange={(e) => setMapsUrl(e.target.value)}
              />
            )}
          </form>
        )}
      </CardContent>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Xóa bình chọn này?"
        description="Mọi lựa chọn và phiếu bầu sẽ bị xóa. Hoạt động đã thêm vào lịch trình (nếu có) vẫn giữ."
        confirmLabel="Xóa"
        destructive
        pending={remove.isPending}
        onConfirm={() => remove.mutate(poll.id, { onSuccess: () => setConfirmDelete(false), onError })}
      />
    </Card>
  )
}
