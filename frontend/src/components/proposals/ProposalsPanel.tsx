import { ChevronDown, Plus, RotateCw, SlidersHorizontal } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  useCreateProposal,
  useDeleteProposal,
  useProposals,
  useScheduleProposal,
  useToggleProposalVote,
  useUpdateProposal,
} from '@/hooks/useProposals'
import { getErrorMessage } from '@/lib/api'
import { cn } from '@/lib/utils'
import type { ProposalResponse } from '@/types/proposal'
import type { TripMemberResponse } from '@/types/trip'
import { ProposalCard } from './ProposalCard'
import { ProposalFormDialog } from './ProposalFormDialog'
import { ScheduleProposalDialog } from './ScheduleProposalDialog'

interface ProposalsPanelProps {
  tripId: number
  myUserId: number
  members: TripMemberResponse[]
}

/** Giữ thứ tự đang hiển thị trong lúc người dùng thả tim liên tục, để thẻ không nhảy khỏi chỗ đang chạm. */
const FREEZE_ORDER_MS = 1500

export function ProposalsPanel({ tripId, myUserId, members }: ProposalsPanelProps) {
  const proposals = useProposals(tripId)
  const create = useCreateProposal(tripId)
  const update = useUpdateProposal(tripId)
  const remove = useDeleteProposal(tripId)
  const schedule = useScheduleProposal(tripId)
  const toggle = useToggleProposalVote(tripId, myUserId)

  const [title, setTitle] = useState('')
  const [formFor, setFormFor] = useState<{ proposal?: ProposalResponse; initialTitle?: string } | null>(null)
  const [toSchedule, setToSchedule] = useState<ProposalResponse | null>(null)
  const [toDelete, setToDelete] = useState<ProposalResponse | null>(null)
  const [showScheduled, setShowScheduled] = useState(false)
  const [frozenOrder, setFrozenOrder] = useState<number[] | null>(null)
  const freezeTimer = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(freezeTimer.current), [])

  if (proposals.isPending) return <Skeleton className="h-64 rounded-3xl" />
  if (proposals.isError) {
    return (
      <div className="rounded-3xl border-2 border-dashed border-rose-200/80 bg-card/80 p-8 text-center shadow-clay-card">
        <p className="text-muted-foreground">{getErrorMessage(proposals.error)}</p>
        <Button variant="outline" className="mt-4" onClick={() => proposals.refetch()}>
          <RotateCw />
          Thử lại
        </Button>
      </div>
    )
  }

  const data = proposals.data
  const onError = (e: unknown) => toast.error(getErrorMessage(e))
  const membersById = new Map(members.map((m) => [m.userId, m]))
  const serverWishlist = data.proposals.filter((p) => !p.scheduled)
  const scheduled = data.proposals.filter((p) => p.scheduled)
  const rank = (id: number) => {
    const index = frozenOrder?.indexOf(id) ?? -1
    return index === -1 ? Number.MAX_SAFE_INTEGER : index
  }
  const wishlist = frozenOrder ? [...serverWishlist].sort((a, b) => rank(a.id) - rank(b.id)) : serverWishlist

  const vote = (p: ProposalResponse) => {
    setFrozenOrder((prev) => prev ?? wishlist.map((x) => x.id))
    window.clearTimeout(freezeTimer.current)
    freezeTimer.current = window.setTimeout(() => setFrozenOrder(null), FREEZE_ORDER_MS)
    toggle.mutate({ proposalId: p.id, vote: !p.votedByMe }, { onError })
  }

  const quickAdd = (event: FormEvent) => {
    event.preventDefault()
    const value = title.trim()
    if (!value) return
    create.mutate(
      { title: value, category: 'OTHER', mapsUrl: null, referenceUrl: null, estimatedCost: null, note: null },
      { onSuccess: () => setTitle(''), onError },
    )
  }

  const card = (p: ProposalResponse) => (
    <ProposalCard
      key={p.id}
      proposal={p}
      membersById={membersById}
      canSchedule={data.canSchedule}
      tripLocked={data.tripLocked}
      onVote={() => vote(p)}
      onEdit={() => setFormFor({ proposal: p })}
      onDelete={() => setToDelete(p)}
      onSchedule={() => setToSchedule(p)}
    />
  )

  return (
    <div className="grid gap-4">
      <form onSubmit={quickAdd} className="flex gap-2">
        <Input
          placeholder="Đề xuất quán, homestay, chỗ check-in…"
          maxLength={150}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          aria-label="Tên đề xuất mới"
          className="min-w-0 flex-1"
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Thêm kèm link, chi phí, ghi chú"
          className="rounded-full"
          onClick={() => setFormFor({ initialTitle: title.trim() })}
        >
          <SlidersHorizontal />
        </Button>
        <Button type="submit" disabled={!title.trim() || create.isPending}>
          <Plus />
          Thêm
        </Button>
      </form>

      {data.canSchedule && !data.tripLocked && serverWishlist.length > 0 && (
        <p className="text-xs font-medium text-muted-foreground">
          Chốt ngày đi ở tab Lịch rảnh để đưa các đề xuất vào lịch trình.
        </p>
      )}

      {data.proposals.length === 0 ? (
        <div className="rounded-[28px] border-2 border-dashed border-rose-200 bg-card/60 px-6 py-12 text-center shadow-clay-card">
          <p className="animate-float-slow text-5xl">💡</p>
          <h2 className="mt-4 text-lg font-bold text-foreground">Chưa có đề xuất nào</h2>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
            Thấy quán ngon, homestay xinh hay chỗ check-in đẹp? Thêm vào đây để cả nhóm thả tim nhé!
          </p>
        </div>
      ) : (
        <>
          {wishlist.length === 0 ? (
            <p className="text-sm font-medium text-muted-foreground">Mọi đề xuất đều đã được đưa vào lịch trình 🎉</p>
          ) : (
            <div className="grid gap-3">{wishlist.map(card)}</div>
          )}

          {scheduled.length > 0 && (
            <div className="grid gap-3">
              <button
                type="button"
                aria-expanded={showScheduled}
                onClick={() => setShowScheduled((v) => !v)}
                className="flex items-center gap-1.5 justify-self-start rounded-full px-2 py-1 text-sm font-bold text-muted-foreground hover:text-foreground"
              >
                <ChevronDown className={cn('size-4 transition-transform', showScheduled && 'rotate-180')} />
                Đã lên lịch ({scheduled.length})
              </button>
              {showScheduled && scheduled.map(card)}
            </div>
          )}
        </>
      )}

      <ProposalFormDialog
        target={formFor}
        pending={create.isPending || update.isPending}
        onOpenChange={(open) => !open && setFormFor(null)}
        onSubmit={async (body) => {
          if (formFor?.proposal) {
            await update.mutateAsync({ proposalId: formFor.proposal.id, body })
          } else {
            await create.mutateAsync(body)
            setTitle('')
          }
          setFormFor(null)
        }}
      />
      <ScheduleProposalDialog
        tripId={tripId}
        proposal={toSchedule}
        pending={schedule.isPending}
        onOpenChange={(open) => !open && setToSchedule(null)}
        onSubmit={async (body, dayText) => {
          if (!toSchedule) return
          await schedule.mutateAsync({ proposalId: toSchedule.id, body })
          setToSchedule(null)
          toast.success(`Đã thêm vào ${dayText} 🎉`, { description: 'Xem ở tab Lịch trình' })
        }}
      />
      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(open) => !open && setToDelete(null)}
        title="Xóa đề xuất này?"
        description={
          toDelete?.scheduled
            ? 'Tim của mọi người sẽ mất. Hoạt động đã đưa vào lịch trình vẫn giữ nguyên.'
            : 'Tim của mọi người cho đề xuất này cũng sẽ mất.'
        }
        confirmLabel="Xóa"
        destructive
        pending={remove.isPending}
        onConfirm={() => toDelete && remove.mutate(toDelete.id, { onSuccess: () => setToDelete(null), onError })}
      />
    </div>
  )
}
