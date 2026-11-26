import { CalendarCheck, CalendarPlus, Heart, Link2, MapPin, Pencil, Trash2 } from 'lucide-react'
import { useLayoutEffect, useRef, useState } from 'react'
import { RowMenuButton } from '@/components/common/layout'
import { dayLabel } from '@/components/itinerary/dayLabel'
import { UserAvatar } from '@/components/UserAvatar'
import { AvatarGroup } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { formatVnd, itineraryCategory } from '@/lib/tripContent'
import { cn } from '@/lib/utils'
import type { ProposalResponse } from '@/types/proposal'
import type { TripMemberResponse } from '@/types/trip'
import { referenceLabel } from './linkKind'

interface ProposalCardProps {
  proposal: ProposalResponse
  membersById: Map<number, TripMemberResponse>
  canSchedule: boolean
  tripLocked: boolean
  onVote: () => void
  onEdit: () => void
  onDelete: () => void
  onSchedule: () => void
}

const chip =
  'inline-flex max-w-full items-center gap-1 rounded-full border border-border bg-background/60 px-2.5 py-1 text-xs font-semibold'

export function ProposalCard({
  proposal: p,
  membersById,
  canSchedule,
  tripLocked,
  onVote,
  onEdit,
  onDelete,
  onSchedule,
}: ProposalCardProps) {
  const category = itineraryCategory(p.category)
  const showSchedule = canSchedule && !p.scheduled
  const hasMenu = p.canEdit || p.canDelete || showSchedule

  return (
    <div
      className={cn(
        'flex gap-3 rounded-surface border border-border bg-card p-3.5 shadow-flat sm:p-4',
        p.scheduled && 'bg-muted/40',
      )}
    >
      <div className={cn('flex size-10 shrink-0 items-center justify-center rounded-item', category.tone)} aria-hidden>
        <category.icon className="size-5" />
      </div>

      <div className="min-w-0 flex-1 space-y-1.5">
        <p className="line-clamp-2 font-bold break-words text-foreground">{p.title}</p>

        {(p.mapsUrl || p.referenceUrl || p.estimatedCost != null || p.scheduled) && (
          <div className="flex flex-wrap gap-1.5">
            {p.scheduled && (
              <span className={cn(chip, 'border-transparent bg-success-soft text-success-soft-foreground')}>
                <CalendarCheck className="size-3.5 shrink-0" />
                {dayLabel({ dayIndex: p.scheduled.dayIndex, date: p.scheduled.date, overflow: false })}
                {p.scheduled.startTime && ` · ${p.scheduled.startTime}`}
              </span>
            )}
            {p.mapsUrl && (
              <a
                href={p.mapsUrl}
                target="_blank"
                rel="noreferrer"
                className={cn(chip, 'relative touch-target text-primary-strong hover:bg-muted')}
              >
                <MapPin className="size-3.5 shrink-0" />
                Maps
              </a>
            )}
            {p.referenceUrl && (
              <a
                href={p.referenceUrl}
                target="_blank"
                rel="noreferrer"
                className={cn(chip, 'relative touch-target text-primary-strong hover:bg-muted')}
              >
                <Link2 className="size-3.5 shrink-0" />
                <span className="truncate">{referenceLabel(p.referenceUrl)}</span>
              </a>
            )}
            {p.estimatedCost != null && (
              <span className={cn(chip, 'text-foreground')}>~{formatVnd(p.estimatedCost)}</span>
            )}
          </div>
        )}

        {p.note && <ProposalNote note={p.note} />}

        <div className="flex items-center gap-2 pt-0.5">
          {p.voterIds.length > 0 && (
            <AvatarGroup>
              {p.voterIds.slice(0, 5).map((id) => {
                const m = membersById.get(id)
                return m ? (
                  <UserAvatar key={id} userId={id} name={m.displayName} avatarUrl={m.avatarUrl} size="sm" />
                ) : null
              })}
            </AvatarGroup>
          )}
          {p.createdByName && <p className="truncate text-xs text-muted-foreground">{p.createdByName} đề xuất</p>}
        </div>
      </div>

      <div className="flex shrink-0 flex-col items-center gap-1">
        <button
          type="button"
          aria-pressed={p.votedByMe}
          aria-label={p.votedByMe ? `Bỏ tim ${p.title}` : `Thả tim ${p.title}`}
          onClick={onVote}
          className={cn(
            'flex size-11 flex-col items-center justify-center rounded-full border transition-colors duration-150 outline-none focus-visible:ring-3 focus-visible:ring-ring',
            p.votedByMe
              ? 'border-transparent bg-primary-strong text-primary-strong-foreground shadow-flat'
              : 'border-border bg-card text-primary-strong hover:bg-muted',
          )}
        >
          <Heart className={cn('size-4', p.votedByMe && 'fill-current')} />
          <span className="text-xs leading-none font-bold">{p.voteCount}</span>
        </button>

        {hasMenu && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <RowMenuButton label={`Tùy chọn cho ${p.title}`} />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {showSchedule && (
                <DropdownMenuItem disabled={!tripLocked} onSelect={onSchedule}>
                  <CalendarPlus />
                  {tripLocked ? 'Đưa vào lịch trình' : 'Đưa vào lịch trình (chốt ngày trước)'}
                </DropdownMenuItem>
              )}
              {p.canEdit && (
                <DropdownMenuItem onSelect={onEdit}>
                  <Pencil />
                  Sửa
                </DropdownMenuItem>
              )}
              {p.canDelete && (
                <>
                  {(showSchedule || p.canEdit) && <DropdownMenuSeparator />}
                  <DropdownMenuItem variant="destructive" onSelect={onDelete}>
                    <Trash2 />
                    Xóa
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  )
}

/** Ghi chú dài: gọn 2 dòng, có nút "Xem thêm" khi thật sự bị cắt (P3-YT-09). */
function ProposalNote({ note }: { note: string }) {
  const ref = useRef<HTMLParagraphElement>(null)
  const [expanded, setExpanded] = useState(false)
  const [clamped, setClamped] = useState(false)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el || expanded) return
    const measure = () => setClamped(el.scrollHeight > el.clientHeight + 1)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [note, expanded])

  return (
    <div>
      <p
        ref={ref}
        className={cn('text-sm break-words whitespace-pre-line text-muted-foreground', !expanded && 'line-clamp-2')}
      >
        {note}
      </p>
      {(clamped || expanded) && (
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded((v) => !v)}
          className="relative touch-target text-xs font-semibold text-primary-strong hover:underline"
        >
          {expanded ? 'Thu gọn' : 'Xem thêm'}
        </button>
      )}
    </div>
  )
}
