import { useEffect, useRef } from 'react'
import { UserAvatar } from '@/components/UserAvatar'
import { formatShortDate, isWeekend, weekdayShort } from '@/lib/date'
import { cn } from '@/lib/utils'
import type { AvailabilityMatrixResponse, AvailabilityStatus } from '@/types/availability'
import { cellStyle } from './statusStyle'

interface AvailabilityGridProps {
  matrix: AvailabilityMatrixResponse
  dates: string[]
  myUserId: number
  editable: boolean
  statusOf: (userId: number, date: string) => AvailabilityStatus | null
  /** Gọi khi chạm hoặc kéo qua 1 ô của hàng mình */
  onPaint: (date: string) => void
}

/**
 * Bảng thành viên × ngày. Cột tên dính trái, ngày cuộn ngang. Hàng của mình nằm đầu và vẽ được
 * bằng chạm/kéo: pointerdown nhả pointer capture để pointerenter bắn trên các ô kế tiếp
 * (cần cho cảm ứng), touch-action: none để kéo không cuộn trang.
 */
export function AvailabilityGrid({ matrix, dates, myUserId, editable, statusOf, onPaint }: AvailabilityGridProps) {
  const painting = useRef(false)

  useEffect(() => {
    const stop = () => {
      painting.current = false
    }
    window.addEventListener('pointerup', stop)
    window.addEventListener('pointercancel', stop)
    return () => {
      window.removeEventListener('pointerup', stop)
      window.removeEventListener('pointercancel', stop)
    }
  }, [])

  const members = [...matrix.members].sort((a, b) =>
    a.userId === myUserId ? -1 : b.userId === myUserId ? 1 : 0,
  )
  const lockedStart = matrix.startDate
  const lockedEnd = matrix.endDate
  const inLocked = (date: string) => Boolean(lockedStart && lockedEnd && date >= lockedStart && date <= lockedEnd)
  const summaryByDate = new Map(matrix.days.map((d) => [d.date, d]))
  const total = matrix.members.length

  return (
    <div className="-mx-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
      <table className="border-separate border-spacing-1 text-sm select-none">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 bg-card" />
            {dates.map((date) => (
              <th
                key={date}
                scope="col"
                className={cn(
                  'min-w-9 rounded-lg px-0.5 py-1 text-center text-xs font-medium',
                  isWeekend(date) ? 'bg-rose-50 text-rose-600' : 'text-muted-foreground',
                  inLocked(date) && 'bg-primary text-primary-foreground',
                )}
              >
                <div>{weekdayShort(date)}</div>
                <div className="font-semibold">{formatShortDate(date)}</div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {members.map((member) => {
            const isMe = member.userId === myUserId
            const canPaint = isMe && editable
            return (
              <tr key={member.userId}>
                <th
                  scope="row"
                  className={cn(
                    'sticky left-0 z-10 bg-card pr-2 text-left font-normal',
                    isMe && 'font-semibold',
                  )}
                >
                  <div className="flex w-28 items-center gap-2 sm:w-36">
                    <UserAvatar userId={member.userId} name={member.displayName} avatarUrl={member.avatarUrl} size="sm" />
                    <div className="min-w-0">
                      <p className="truncate">{isMe ? 'Bạn' : member.displayName}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {member.respondedDays}/{dates.length} ngày
                      </p>
                    </div>
                  </div>
                </th>
                {dates.map((date) => {
                  const status = statusOf(member.userId, date)
                  const style = cellStyle(status)
                  return (
                    <td key={date} className="p-0">
                      <div
                        role={canPaint ? 'button' : undefined}
                        aria-label={`${isMe ? 'Bạn' : member.displayName} ${formatShortDate(date)}: ${style.label}`}
                        className={cn(
                          'flex size-9 items-center justify-center rounded-lg text-sm font-bold transition-colors',
                          style.className,
                          canPaint && 'cursor-pointer touch-none ring-primary/40 hover:ring-2',
                          isMe && !editable && 'opacity-90',
                        )}
                        onPointerDown={
                          canPaint
                            ? (e) => {
                                e.preventDefault()
                                ;(e.target as Element).releasePointerCapture?.(e.pointerId)
                                painting.current = true
                                onPaint(date)
                              }
                            : undefined
                        }
                        onPointerEnter={canPaint ? () => painting.current && onPaint(date) : undefined}
                      >
                        {style.symbol}
                      </div>
                    </td>
                  )
                })}
              </tr>
            )
          })}
          <tr>
            <th scope="row" className="sticky left-0 z-10 bg-card pt-1 text-left text-xs font-medium text-muted-foreground">
              Số người rảnh
            </th>
            {dates.map((date) => {
              const summary = summaryByDate.get(date)
              const available = summary?.available ?? 0
              const ratio = total > 0 ? available / total : 0
              return (
                <td key={date} className="p-0 pt-1">
                  <div
                    className="flex size-9 flex-col items-center justify-center rounded-lg text-xs font-semibold"
                    style={{
                      backgroundColor: `rgb(16 185 129 / ${0.08 + ratio * 0.72})`,
                      color: ratio > 0.55 ? 'white' : 'rgb(6 95 70)',
                    }}
                    title={
                      summary
                        ? `${summary.available} rảnh · ${summary.maybe} có thể · ${summary.busy} bận · ${summary.unknown} chưa khai`
                        : undefined
                    }
                  >
                    {available}
                    {summary && summary.maybe > 0 && <span className="text-[10px] font-normal">+{summary.maybe}?</span>}
                  </div>
                </td>
              )
            })}
          </tr>
        </tbody>
      </table>
    </div>
  )
}
