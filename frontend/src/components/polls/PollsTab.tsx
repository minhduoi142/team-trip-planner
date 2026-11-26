import { Check, Lock, MapPin, Plus, Trash2, Trophy, Undo2, Vote } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { RowMenuButton } from '@/components/common/layout'
import { EmptyState, TabErrorState, TabSkeleton } from '@/components/common/states'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { UserAvatar } from '@/components/UserAvatar'
import { AvatarGroup } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
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
import type { PollOptionResponse, PollResponse } from '@/types/poll'
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

  if (polls.isPending) return <TabSkeleton variant={canCreate ? 'form+list' : 'list'} />
  if (polls.isError) return <TabErrorState error={polls.error} onRetry={() => polls.refetch()} />

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
            className="min-w-0 flex-1"
          />
          <Button type="submit" disabled={!title.trim() || create.isPending}>
            <Vote />
            Tạo
          </Button>
        </form>
      )}

      {polls.data.polls.length === 0 ? (
        <EmptyState
          icon={Vote}
          title="Chưa có bình chọn nào"
          description={
            canCreate
              ? 'Phân vân ăn gì, đi đâu? Tạo bình chọn để cả nhóm vote nhé!'
              : 'Khi có bình chọn, bạn sẽ thấy ở đây.'
          }
        />
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
          toast.success(body.addToItinerary ? 'Đã chốt và thêm vào lịch trình' : 'Đã chốt bình chọn')
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
  const [optionToDelete, setOptionToDelete] = useState<PollOptionResponse | null>(null)
  const membersById = new Map(members.map((m) => [m.userId, m]))
  const maxVotes = Math.max(1, ...poll.options.map((o) => o.voteCount))
  const onError = (e: unknown) => toast.error(getErrorMessage(e))

  /** Chưa có phiếu thì xóa ngay; đã có phiếu thì hỏi lại (P3-YT-03). */
  const requestDeleteOption = (o: PollOptionResponse) => {
    if (o.voteCount > 0) setOptionToDelete(o)
    else deleteOption.mutate(o.id, { onError })
  }

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
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-2">
        <div className="min-w-0">
          <CardTitle className="flex flex-wrap items-center gap-2 text-base font-bold break-words text-foreground sm:text-lg">
            {poll.title}
            {poll.closed && (
              <Badge variant="secondary">
                <Lock aria-hidden="true" />
                Đã đóng
              </Badge>
            )}
          </CardTitle>
          <p className="mt-1 text-xs font-medium text-muted-foreground">
            {poll.createdByName ? `${poll.createdByName} tạo` : 'Bình chọn'} ·{' '}
            {poll.closed ? 'không nhận thêm phiếu' : 'chọn được nhiều lựa chọn'}
          </p>
        </div>
        {poll.canManage && (
          <div className="flex shrink-0 items-center gap-1.5">
            {!poll.closed && poll.options.length > 0 && (
              <Button size="sm" onClick={onClose}>
                <Trophy />
                Chốt
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <RowMenuButton label={`Tùy chọn cho bình chọn ${poll.title}`} />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {poll.closed && (
                  <>
                    <DropdownMenuItem onSelect={() => reopen.mutate(poll.id, { onError })}>
                      <Undo2 />
                      Mở lại
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
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
          <p className="text-sm font-medium text-muted-foreground">
            Chưa có lựa chọn nào, thêm đề xuất của bạn bên dưới nhé.
          </p>
        )}
        {poll.options.map((o) => {
          const winner = poll.winningOptionId === o.id
          const href = mapsHref(o.mapsUrl, null)
          const voterNames = o.voterIds
            .map((id) => membersById.get(id)?.displayName)
            .filter(Boolean)
            .join(', ')
          return (
            <div
              key={o.id}
              className={cn(
                'relative flex items-center gap-1 overflow-hidden rounded-xl bg-muted/40 pr-1',
                winner && 'ring-2 ring-warning',
              )}
            >
              <div
                className={cn(
                  'absolute inset-y-0 left-0 transition-[width] duration-300',
                  winner ? 'bg-warning/25' : 'bg-primary/15',
                )}
                style={{ width: `${(o.voteCount / maxVotes) * 100}%` }}
                aria-hidden
              />
              {/* Cả hàng là nút vote (P3-YT-01); vòng tròn chỉ báo trạng thái */}
              <button
                type="button"
                role="checkbox"
                aria-checked={o.votedByMe}
                disabled={poll.closed}
                aria-label={`${o.name}: ${o.voteCount} phiếu${voterNames ? ` (${voterNames})` : ''}${winner ? ', đã chốt' : ''}`}
                onClick={() => toggle.mutate({ optionId: o.id, vote: !o.votedByMe }, { onError })}
                className="relative flex min-h-12 min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-xl py-2 pl-3 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring disabled:cursor-default"
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    'flex size-6 shrink-0 items-center justify-center rounded-full border-2',
                    o.votedByMe
                      ? 'border-primary-strong bg-primary-strong text-primary-strong-foreground'
                      : 'border-border bg-card',
                    poll.closed && !o.votedByMe && 'border-dashed',
                  )}
                >
                  {o.votedByMe && <Check className="size-3.5 stroke-3" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-start gap-1.5 font-bold text-foreground">
                    {winner && <Trophy className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />}
                    <span className="line-clamp-2 break-words">{o.name}</span>
                  </span>
                  {(winner || o.createdByName) && (
                    <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                      {winner && (
                        <span className="rounded-full bg-warning-soft px-2 py-0.5 font-semibold text-warning-soft-foreground">
                          Đã chốt
                        </span>
                      )}
                      {o.createdByName && <span>{o.createdByName} đề xuất</span>}
                    </span>
                  )}
                </span>
                <span
                  className="w-7 shrink-0 text-right text-sm font-bold text-foreground"
                  title={voterNames || undefined}
                >
                  {o.voteCount}
                </span>
              </button>
              {href && (
                <Button asChild variant="ghost" size="icon-sm" className="shrink-0 rounded-full">
                  <a href={href} target="_blank" rel="noreferrer" aria-label={`Xem ${o.name} trên Google Maps`}>
                    <MapPin className="text-primary-strong" />
                  </a>
                </Button>
              )}
              <AvatarGroup className="relative hidden shrink-0 sm:flex" aria-hidden="true">
                {o.voterIds.slice(0, 4).map((id) => {
                  const m = membersById.get(id)
                  return m ? (
                    <UserAvatar key={id} userId={id} name={m.displayName} avatarUrl={m.avatarUrl} size="sm" />
                  ) : null
                })}
              </AvatarGroup>
              {o.canDelete && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <RowMenuButton label={`Tùy chọn cho ${o.name}`} />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem variant="destructive" onSelect={() => requestDeleteOption(o)}>
                      <Trash2 />
                      Xóa lựa chọn
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          )
        })}

        {!poll.closed && (
          <form onSubmit={submitOption} className="mt-1.5 grid gap-2">
            <div className="flex gap-2">
              <Input
                placeholder="Thêm lựa chọn…"
                maxLength={150}
                value={name}
                onChange={(e) => setName(e.target.value)}
                aria-label="Tên lựa chọn mới"
                className="min-w-0 flex-1"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Thêm link Google Maps"
                aria-pressed={showMaps}
                className={cn('rounded-full', showMaps && 'bg-primary/10 text-primary-strong')}
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
                aria-label="Link Google Maps của lựa chọn mới"
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
      <ConfirmDialog
        open={optionToDelete !== null}
        onOpenChange={(open) => !open && setOptionToDelete(null)}
        title={`Xóa lựa chọn "${optionToDelete?.name ?? ''}"?`}
        description={`Lựa chọn này đang có ${optionToDelete?.voteCount ?? 0} phiếu. Các phiếu đó cũng sẽ mất.`}
        confirmLabel="Xóa"
        destructive
        pending={deleteOption.isPending}
        onConfirm={() =>
          optionToDelete &&
          deleteOption.mutate(optionToDelete.id, { onSuccess: () => setOptionToDelete(null), onError })
        }
      />
    </Card>
  )
}
