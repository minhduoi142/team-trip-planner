import { CalendarCheck, CalendarPlus, Heart, Link2, MapPin, MoreVertical, Pencil, Trash2 } from 'lucide-react'
import { dayLabel } from '@/components/itinerary/dayLabel'
import { UserAvatar } from '@/components/UserAvatar'
import { AvatarGroup } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
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
  'inline-flex max-w-full items-center gap-1 rounded-full border border-white/70 bg-white/70 px-2.5 py-1 text-xs font-semibold shadow-clay-badge'

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
        'flex gap-3 rounded-[24px] border-2 border-white/80 bg-card p-3.5 shadow-clay-card transition-shadow duration-300 hover:shadow-clay-card-hover sm:p-4',
        p.scheduled && 'bg-muted/40',
      )}
    >
      <div className={cn('flex size-10 shrink-0 items-center justify-center rounded-2xl', category.tone)} aria-hidden>
        <category.icon className="size-5" />
      </div>

      <div className="min-w-0 flex-1 space-y-1.5">
        <p className="line-clamp-2 font-bold break-words text-foreground">{p.title}</p>

        {(p.mapsUrl || p.referenceUrl || p.estimatedCost != null || p.scheduled) && (
          <div className="flex flex-wrap gap-1.5">
            {p.scheduled && (
              <span className={cn(chip, 'border-emerald-200 bg-emerald-50 text-emerald-700')}>
                <CalendarCheck className="size-3.5 shrink-0" />
                {dayLabel({ dayIndex: p.scheduled.dayIndex, date: p.scheduled.date, overflow: false })}
                {p.scheduled.startTime && ` · ${p.scheduled.startTime}`}
              </span>
            )}
            {p.mapsUrl && (
              <a href={p.mapsUrl} target="_blank" rel="noreferrer" className={cn(chip, 'text-primary hover:bg-white')}>
                <MapPin className="size-3.5 shrink-0" />
                Maps
              </a>
            )}
            {p.referenceUrl && (
              <a href={p.referenceUrl} target="_blank" rel="noreferrer" className={cn(chip, 'text-primary hover:bg-white')}>
                <Link2 className="size-3.5 shrink-0" />
                <span className="truncate">{referenceLabel(p.referenceUrl)}</span>
              </a>
            )}
            {p.estimatedCost != null && <span className={cn(chip, 'text-foreground')}>~{formatVnd(p.estimatedCost)}</span>}
          </div>
        )}

        {p.note && <p className="line-clamp-2 text-sm whitespace-pre-line text-muted-foreground">{p.note}</p>}

        <div className="flex items-center gap-2 pt-0.5">
          {p.voterIds.length > 0 && (
            <AvatarGroup>
              {p.voterIds.slice(0, 5).map((id) => {
                const m = membersById.get(id)
                return m ? <UserAvatar key={id} userId={id} name={m.displayName} avatarUrl={m.avatarUrl} size="sm" /> : null
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
            'flex size-11 flex-col items-center justify-center rounded-full border-2 transition-all duration-200 active:scale-90',
            p.votedByMe
              ? 'border-rose-300 bg-gradient-to-tr from-rose-500 to-rose-600 text-white shadow-clay-btn-primary'
              : 'border-white bg-card text-rose-500 shadow-clay-badge hover:scale-105',
          )}
        >
          <Heart className={cn('size-4', p.votedByMe && 'fill-current')} />
          <span className="text-[11px] leading-none font-bold">{p.voteCount}</span>
        </button>

        {hasMenu && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label={`Tùy chọn ${p.title}`} className="rounded-full">
                <MoreVertical className="size-4" />
              </Button>
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
