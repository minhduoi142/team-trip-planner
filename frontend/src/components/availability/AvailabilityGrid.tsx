import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { UserAvatar } from '@/components/UserAvatar'
import { formatShortDate, isWeekend, weekdayShort } from '@/lib/date'
import { cn } from '@/lib/utils'
import type { AvailabilityMatrixResponse, AvailabilityStatus, DaySummaryResponse } from '@/types/availability'
import { cellStyle } from './statusStyle'

interface AvailabilityGridProps {
  matrix: AvailabilityMatrixResponse
  dates: string[]
  myUserId: number
  editable: boolean
  statusOf: (userId: number, date: string) => AvailabilityStatus | null
  /** Gọi khi chạm, kéo qua hoặc bấm Enter/Space trên 1 ô của hàng mình */
  onPaint: (date: string) => void
}

/** Nền + màu chữ của ô "Số người rảnh": tránh vùng giữa nơi cả chữ trắng lẫn chữ đậm đều dưới 4,5:1. */
function summaryStyle(ratio: number) {
  if (ratio <= 0) return { backgroundColor: 'var(--card)', color: 'var(--muted-foreground)' }
  if (ratio >= 0.75) return { backgroundColor: 'var(--avail-yes)', color: 'var(--avail-yes-foreground)' }
  const mix = Math.round(8 + (ratio / 0.75) * 37) // 8% → 45%
  return {
    backgroundColor: `color-mix(in oklch, var(--avail-yes) ${mix}%, var(--card))`,
    color: 'var(--avail-yes-soft-foreground)',
  }
}

function summaryText(date: string, summary: DaySummaryResponse | undefined) {
  if (!summary) return formatShortDate(date)
  return `${formatShortDate(date)}: ${summary.available} rảnh, ${summary.maybe} có thể, ${summary.busy} bận, ${summary.unknown} chưa khai`
}

/**
 * Bảng thành viên × ngày. Cột tên dính trái, hàng ngày dính trên khi cuộn trong khung.
 * Hàng của mình nằm đầu và vẽ được bằng chạm/kéo: pointerdown nhả pointer capture để
 * pointerenter bắn trên các ô kế tiếp. Bàn phím: Tab vào hàng, mũi tên/Home/End để di chuyển,
 * Enter hoặc Space tô bằng cọ hiện tại.
 */
export function AvailabilityGrid({ matrix, dates, myUserId, editable, statusOf, onPaint }: AvailabilityGridProps) {
  const painting = useRef(false)
  const myRowRef = useRef<HTMLTableRowElement>(null)
  const [activeDate, setActiveDate] = useState<string | null>(null)

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

  const members = [...matrix.members].sort((a, b) => (a.userId === myUserId ? -1 : b.userId === myUserId ? 1 : 0))
  const lockedStart = matrix.startDate
  const lockedEnd = matrix.endDate
  const inLocked = (date: string) => Boolean(lockedStart && lockedEnd && date >= lockedStart && date <= lockedEnd)
  const summaryByDate = new Map(matrix.days.map((d) => [d.date, d]))
  const total = matrix.members.length
  const tabbableDate = activeDate && dates.includes(activeDate) ? activeDate : dates[0]

  const focusDate = (index: number) => {
    const date = dates[Math.max(0, Math.min(dates.length - 1, index))]
    myRowRef.current?.querySelector<HTMLButtonElement>(`button[data-date="${date}"]`)?.focus()
  }

  const onCellKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const moves: Record<string, number> = {
      ArrowLeft: index - 1,
      ArrowRight: index + 1,
      Home: 0,
      End: dates.length - 1,
    }
    if (e.key in moves) {
      e.preventDefault()
      focusDate(moves[e.key])
    }
  }

  const stickyCol = 'sticky left-0 z-10 bg-card'

  return (
    <div className="max-h-[70svh] overflow-auto overscroll-x-contain">
      <table className="border-separate border-spacing-0 text-sm select-none">
        <thead>
          <tr>
            <th className={cn(stickyCol, 'top-0 z-20')}>
              <span className="sr-only">Thành viên</span>
            </th>
            {dates.map((date) => (
              <th key={date} scope="col" className="sticky top-0 z-10 bg-card p-0.5 pb-1">
                <div
                  className={cn(
                    'min-w-9 rounded-lg px-1 py-1 text-center text-xs font-semibold',
                    inLocked(date)
                      ? 'bg-primary-strong text-primary-strong-foreground'
                      : isWeekend(date)
                        ? 'bg-muted text-primary-strong'
                        : 'bg-muted/60 text-muted-foreground',
                  )}
                >
                  <div className="font-medium">{weekdayShort(date)}</div>
                  <div className="font-bold">{formatShortDate(date)}</div>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {members.map((member) => {
            const isMe = member.userId === myUserId
            const canPaint = isMe && editable
            const name = isMe ? 'Bạn' : member.displayName
            return (
              <tr key={member.userId} ref={isMe ? myRowRef : undefined}>
                <th scope="row" className={cn(stickyCol, 'p-0.5 pr-2 text-left font-normal')}>
                  <div
                    className={cn(
                      'flex w-12 items-center gap-2 rounded-item p-1 sm:w-40 sm:p-1.5',
                      isMe && 'bg-primary/10',
                    )}
                  >
                    <UserAvatar
                      userId={member.userId}
                      name={member.displayName}
                      avatarUrl={member.avatarUrl}
                      size="sm"
                    />
                    <div className="sr-only min-w-0 sm:not-sr-only">
                      <p className={cn('truncate text-sm', isMe ? 'font-bold' : 'font-semibold')}>{name}</p>
                      <p className="text-xs text-muted-foreground">
                        {member.respondedDays}/{dates.length} ngày
                      </p>
                    </div>
                  </div>
                </th>
                {dates.map((date, index) => {
                  const status = statusOf(member.userId, date)
                  const style = cellStyle(status)
                  const Icon = style.icon
                  const label = `${name}, ${formatShortDate(date)}: ${style.label}`
                  const cellClass = cn(
                    'flex size-9 items-center justify-center rounded-lg',
                    style.className,
                    isMe && !editable && 'opacity-90',
                  )
                  const content = Icon ? <Icon className="size-4" strokeWidth={3} aria-hidden="true" /> : null
                  return (
                    <td key={date} className={cn('p-0.5', inLocked(date) && 'bg-primary/10')}>
                      {canPaint ? (
                        <button
                          type="button"
                          data-date={date}
                          aria-label={label}
                          tabIndex={date === tabbableDate ? 0 : -1}
                          className={cn(
                            cellClass,
                            'cursor-pointer touch-none outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
                          )}
                          onFocus={() => setActiveDate(date)}
                          onKeyDown={(e) => onCellKeyDown(e, index)}
                          // Chuột/chạm đã tô ở pointerdown; click chỉ xử lý khi kích hoạt bằng bàn phím (detail = 0)
                          onClick={(e) => {
                            if (e.detail === 0) onPaint(date)
                          }}
                          onPointerDown={(e) => {
                            e.preventDefault()
                            ;(e.target as Element).releasePointerCapture?.(e.pointerId)
                            painting.current = true
                            onPaint(date)
                          }}
                          onPointerEnter={() => painting.current && onPaint(date)}
                        >
                          {content}
                        </button>
                      ) : (
                        <div role="img" aria-label={label} className={cellClass}>
                          {content}
                        </div>
                      )}
                    </td>
                  )
                })}
              </tr>
            )
          })}
          <tr>
            <th
              scope="row"
              className={cn(
                stickyCol,
                'p-0.5 pt-2 pr-2 text-left text-xs leading-tight font-bold text-muted-foreground',
              )}
            >
              <span className="sm:hidden" aria-hidden="true">
                Rảnh
              </span>
              <span className="sr-only sm:not-sr-only">Số người rảnh</span>
            </th>
            {dates.map((date) => {
              const summary = summaryByDate.get(date)
              const available = summary?.available ?? 0
              const ratio = total > 0 ? available / total : 0
              const text = summaryText(date, summary)
              return (
                <td key={date} className={cn('p-0.5 pt-2', inLocked(date) && 'bg-primary/10')}>
                  <div
                    role="img"
                    aria-label={text}
                    title={text}
                    className="flex size-9 items-center justify-center rounded-lg border border-border text-xs font-bold"
                    style={summaryStyle(ratio)}
                  >
                    {available}
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
