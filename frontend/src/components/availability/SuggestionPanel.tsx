import { CalendarCheck, Minus, Plus, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { UserAvatar } from '@/components/UserAvatar'
import { AvatarGroup } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useLockDate, useSetTripLength } from '@/hooks/useAvailability'
import { getErrorMessage } from '@/lib/api'
import { daysBetweenInclusive, formatRangeWithWeekday } from '@/lib/date'
import { cn } from '@/lib/utils'
import type {
  AvailabilityMatrixResponse,
  AvailabilityMemberResponse,
  SuggestionNote,
  SuggestionResponse,
} from '@/types/availability'

const NOTE_TEXT: Record<SuggestionNote, string> = {
  NO_RANGE: 'Chuyến đi chưa có khoảng ngày dự kiến.',
  LOCKED: 'Chuyến đi đã chốt ngày.',
  NO_RESPONSES: 'Chưa ai khai lịch. Tô lịch của bạn ở bảng bên dưới để mở màn nhé!',
  RANGE_TOO_SHORT: 'Số ngày còn lại trong khoảng dự kiến ít hơn số ngày muốn đi.',
  NO_MATCH: 'Chưa có khoảng nào đủ người đi được. Rủ mọi người khai thêm lịch nha!',
}

const MIN_LENGTH = 1
const MAX_LENGTH = 14
const MEDALS = ['🥇', '🥈', '🥉']

interface SuggestionPanelProps {
  tripId: number
  matrix: AvailabilityMatrixResponse
  canEditLength: boolean
  canLock: boolean
}

export function SuggestionPanel({ tripId, matrix, canEditLength, canLock }: SuggestionPanelProps) {
  const setLength = useSetTripLength(tripId)
  const lockDate = useLockDate(tripId)
  const [toLock, setToLock] = useState<SuggestionResponse | null>(null)
  const membersById = new Map(matrix.members.map((m) => [m.userId, m]))
  const length = matrix.effectiveLengthDays

  const changeLength = (next: number) =>
    setLength.mutate(next, { onError: (error) => toast.error(getErrorMessage(error)) })

  const confirmLock = () => {
    if (!toLock) return
    lockDate.mutate(
      { startDate: toLock.startDate, endDate: toLock.endDate },
      {
        onSuccess: () => {
          setToLock(null)
          toast.success('Đã chốt ngày đi! 🎉 Giờ lên lịch trình thôi')
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    )
  }

  return (
      <Card className="rounded-[28px] shadow-clay-card border border-border/60 bg-gradient-to-br from-violet-50/70 via-rose-50/70 to-amber-50/70">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="size-5 text-primary animate-pulse-gentle" />
            <span>Gợi ý ngày đẹp nhất</span>
            <span className="text-sm font-normal text-muted-foreground">✨</span>
          </CardTitle>
          <CardDescription>Tính theo lịch mọi người đã khai: rảnh = 1 điểm, có thể = ½ điểm.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
            <div className="flex items-center justify-between gap-3 rounded-full bg-card/90 px-5 py-2.5 shadow-clay-sunken border border-border/70">
              <span className="text-sm font-semibold text-foreground">Đi mấy ngày?</span>
              <div className="flex items-center gap-2">
                {canEditLength && (
                  <Button
                    variant="outline"
                    size="icon-sm"
                    className="rounded-full shadow-clay-badge hover:scale-110 active:scale-90"
                    aria-label="Bớt 1 ngày"
                    disabled={length <= MIN_LENGTH || setLength.isPending}
                    onClick={() => changeLength(length - 1)}
                  >
                    <Minus />
                  </Button>
                )}
                  <span className="w-16 text-center text-lg font-bold text-primary" aria-live="polite">
                    {length} ngày
                  </span>
                  {canEditLength && (
                    <Button
                      variant="outline"
                      size="icon-sm"
                      className="rounded-full shadow-clay-badge hover:scale-110 active:scale-90"
                      aria-label="Thêm 1 ngày"
                      disabled={length >= MAX_LENGTH || setLength.isPending}
                      onClick={() => changeLength(length + 1)}
                    >
                      <Plus />
                    </Button>
                  )}
              </div>
            </div>

            {matrix.suggestions.length === 0 ? (
          <p className="rounded-[24px] bg-card/70 px-4 py-8 text-center text-sm font-medium text-muted-foreground shadow-clay-sunken border border-border/60">
            {matrix.suggestionNote ? NOTE_TEXT[matrix.suggestionNote] : 'Chưa có gợi ý.'}
          </p>
        ) : (
          <ol className="grid gap-3">
            {matrix.suggestions.map((s, index) => (
              <SuggestionCard
                key={s.startDate}
                suggestion={s}
                medal={MEDALS[index]}
                best={index === 0}
                membersById={membersById}
                canLock={canLock}
                onLock={() => setToLock(s)}
              />
            ))}
          </ol>
        )}
      </CardContent>

      <ConfirmDialog
        open={toLock !== null}
        onOpenChange={(open) => !open && setToLock(null)}
        title="Chốt ngày đi này?"
        description={
          toLock
            ? `${formatRangeWithWeekday(toLock.startDate, toLock.endDate)} (${daysBetweenInclusive(toLock.startDate, toLock.endDate)} ngày). Bảng lịch rảnh sẽ khóa lại, cả nhóm thấy ngày chính thức và đếm ngược.`
            : ''
        }
        confirmLabel="Chốt ngày"
        pending={lockDate.isPending}
        onConfirm={confirmLock}
      />
    </Card>
          )
}

          interface SuggestionCardProps {
            suggestion: SuggestionResponse
          medal: string
          best: boolean
          membersById: Map<number, AvailabilityMemberResponse>
          canLock: boolean
  onLock: () => void
}

          function SuggestionCard({suggestion: s, medal, best, membersById, canLock, onLock }: SuggestionCardProps) {
  const names = (ids: number[]) =>
          ids
      .map((id) => membersById.get(id)?.displayName)
          .filter(Boolean)
          .join(', ')
          const going = [...s.availableUserIds, ...s.maybeUserIds]

          return (
          <li
            className={cn(
              'grid gap-3 rounded-[24px] bg-card/95 p-4 shadow-clay-card border border-border/60 transition-all duration-200 hover:-translate-y-1 hover:shadow-clay-card-hover',
              best && 'border-2 border-amber-300/90 shadow-clay-card relative overflow-hidden',
            )}
          >
              {best && (
                <div className="absolute top-0 right-0 rounded-bl-2xl bg-amber-200/90 px-3 py-1 text-[11px] font-bold text-amber-900 shadow-xs">
                  ⭐ Lựa chọn tốt nhất
                </div>
              )}

              <div className="flex items-start justify-between gap-3 pt-1">
                <div>
                    <p className="font-bold text-base text-foreground">
                      <span className="mr-1.5">{medal}</span>
                      {formatRangeWithWeekday(s.startDate, s.endDate)}
                    </p>
                      <p className="mt-1 text-sm font-medium">
                        <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 font-bold text-emerald-800 shadow-clay-badge mr-1">
                          {s.availableCount}/{s.totalMembers} rảnh
                        </span>
                        {s.maybeCount > 0 && <span className="text-amber-700 font-semibold"> · {s.maybeCount} có thể</span>}
                      </p>
                    </div>
                    <AvatarGroup>
                      {going.slice(0, 5).map((id) => {
                        const m = membersById.get(id)
                        return m ? <UserAvatar key={id} userId={id} name={m.displayName} avatarUrl={m.avatarUrl} size="sm" /> : null
                      })}
                    </AvatarGroup>
                </div>

                {(s.maybeUserIds.length > 0 || s.unavailableUserIds.length > 0) && (
                    <div className="space-y-0.5 text-xs text-muted-foreground font-medium">
                      {s.maybeUserIds.length > 0 && <p>Có thể: {names(s.maybeUserIds)}</p>}
                      {s.unavailableUserIds.length > 0 && <p>Chưa đi được: {names(s.unavailableUserIds)}</p>}
                    </div>
      )}

                    {canLock && (
                        <Button
                          size="sm"
                          variant={best ? 'default' : 'outline'}
                          onClick={onLock}
                          className="rounded-full font-semibold gap-1.5 w-fit"
                        >
                          <CalendarCheck className="size-4" />
                          Chốt ngày này
                        </Button>
      )}
                      </li>
                    )
                    }
