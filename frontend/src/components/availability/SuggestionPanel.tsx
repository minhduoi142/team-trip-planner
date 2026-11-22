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
    <Card className="bg-gradient-to-br from-violet-50 via-rose-50 to-amber-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="size-5 text-primary" />
          Gợi ý ngày đẹp nhất
        </CardTitle>
        <CardDescription>Tính theo lịch mọi người đã khai: rảnh = 1 điểm, có thể = ½ điểm.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="flex items-center justify-between gap-3 rounded-2xl bg-background/80 px-4 py-2 ring-1 ring-border">
          <span className="text-sm font-medium">Đi mấy ngày?</span>
          <div className="flex items-center gap-2">
            {canEditLength && (
              <Button
                variant="outline"
                size="icon-sm"
                aria-label="Bớt 1 ngày"
                disabled={length <= MIN_LENGTH || setLength.isPending}
                onClick={() => changeLength(length - 1)}
              >
                <Minus />
              </Button>
            )}
            <span className="w-16 text-center text-lg font-bold" aria-live="polite">
              {length} ngày
            </span>
            {canEditLength && (
              <Button
                variant="outline"
                size="icon-sm"
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
          <p className="rounded-2xl bg-background/60 px-4 py-6 text-center text-sm text-muted-foreground">
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

function SuggestionCard({ suggestion: s, medal, best, membersById, canLock, onLock }: SuggestionCardProps) {
  const names = (ids: number[]) =>
    ids
      .map((id) => membersById.get(id)?.displayName)
      .filter(Boolean)
      .join(', ')
  const going = [...s.availableUserIds, ...s.maybeUserIds]

  return (
    <li
      className={cn(
        'grid gap-3 rounded-2xl bg-background p-4 ring-1 ring-border',
        best && 'ring-2 ring-primary/60',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold">
            <span className="mr-1">{medal}</span>
            {formatRangeWithWeekday(s.startDate, s.endDate)}
          </p>
          <p className="mt-0.5 text-sm">
            <span className="font-bold text-emerald-600">
              {s.availableCount}/{s.totalMembers}
            </span>{' '}
            rảnh
            {s.maybeCount > 0 && <span className="text-amber-700"> · {s.maybeCount} có thể</span>}
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
        <div className="space-y-0.5 text-xs text-muted-foreground">
          {s.maybeUserIds.length > 0 && <p>Có thể: {names(s.maybeUserIds)}</p>}
          {s.unavailableUserIds.length > 0 && <p>Chưa đi được: {names(s.unavailableUserIds)}</p>}
        </div>
      )}
      {canLock && (
        <Button size="sm" variant={best ? 'default' : 'outline'} onClick={onLock}>
          <CalendarCheck />
          Chốt ngày này
        </Button>
      )}
    </li>
  )
}
