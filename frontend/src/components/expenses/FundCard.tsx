import { ChevronDown, Clock, PiggyBank, QrCode, Settings2, TriangleAlert } from 'lucide-react'
import { useId, useState } from 'react'
import { UserAvatar } from '@/components/UserAvatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { formatVnd } from '@/lib/tripContent'
import { cn } from '@/lib/utils'
import type { FundResponse, MemberBalanceResponse } from '@/types/expense'

/** Quỹ được coi là sắp hết khi số dư dưới 10% tổng đã thu (hoặc âm). */
const LOW_RATIO = 0.1

interface FundCardProps {
  fund: FundResponse
  byId: Map<number, MemberBalanceResponse>
  myUserId: number
  busy: boolean
  /** Mở QR nộp quỹ cho thủ quỹ với số tiền này */
  onContribute: (amount: number) => void
  /** OWNER: mở form sửa quỹ */
  onManage: () => void
  onOpenBankProfile: () => void
}

/** Thẻ "Quỹ chung" đầu tab Chi tiêu (docs/sdd-trip-fund.md 4.1). */
export function FundCard({ fund, byId, myUserId, busy, onContribute, onManage, onOpenBankProfile }: FundCardProps) {
  const [open, setOpen] = useState(false)
  const listId = useId()
  const treasurer = byId.get(fund.treasurerId)
  const treasurerName = fund.treasurerId === myUserId ? 'Bạn' : (treasurer?.displayName ?? '?')
  const mine = fund.members.find((m) => m.userId === myUserId)
  const goal = fund.perPersonTarget * fund.members.length
  const percent = goal === 0 ? 0 : Math.min(100, Math.round((fund.totalContributed / goal) * 100))
  const low = fund.balance < 0 || (fund.totalContributed > 0 && fund.balance < fund.totalContributed * LOW_RATIO)
  const paidUp = fund.members.filter((m) => m.remaining === 0 && m.pending === 0).length

  return (
    <Card className="py-0">
      <CardContent className="grid gap-4 p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
              <PiggyBank className="size-4 text-primary-strong" aria-hidden="true" />
              Quỹ chung
            </p>
            {fund.balance >= 0 ? (
              <p className="text-2xl font-bold text-foreground tabular-nums">
                Còn <span className="whitespace-nowrap">{formatVnd(fund.balance)}</span>
              </p>
            ) : (
              <p className="text-xl font-bold text-money-out tabular-nums">
                Thủ quỹ đang ứng <span className="whitespace-nowrap">{formatVnd(-fund.balance)}</span>
              </p>
            )}
            <p className="mt-1 text-sm text-muted-foreground">
              Đã thu{' '}
              <span className="font-semibold text-foreground tabular-nums">{formatVnd(fund.totalContributed)}</span>
              {' · '}Đã chi{' '}
              <span className="font-semibold text-foreground tabular-nums">{formatVnd(fund.totalSpent)}</span>
              {' · '}Thủ quỹ: <span className="font-semibold text-foreground">{treasurerName}</span>
            </p>
          </div>
          {fund.canManage && (
            <Button variant="ghost" size="icon-sm" aria-label="Sửa quỹ chung" onClick={onManage}>
              <Settings2 />
            </Button>
          )}
        </div>

        <div className="grid gap-1.5">
          <Progress value={percent} aria-label="Tiến độ thu quỹ" className="h-2.5" />
          <p className="text-xs text-muted-foreground tabular-nums">
            {paidUp}/{fund.members.length} người đã nộp đủ {formatVnd(fund.perPersonTarget)}
            {fund.totalPending > 0 && ` · ${formatVnd(fund.totalPending)} chờ thủ quỹ xác nhận`}
          </p>
        </div>

        {fund.note && <p className="text-sm whitespace-pre-line text-muted-foreground">{fund.note}</p>}

        {low && (
          <p className="flex items-start gap-2 rounded-item bg-warning-soft px-3 py-2 text-sm text-warning-soft-foreground">
            <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
            <span>
              {fund.balance < 0 ? 'Quỹ đã hết, thủ quỹ đang ứng tiền.' : 'Quỹ sắp hết.'}
              {fund.canManage && ' Nâng mức nộp để thu thêm đợt sau.'}
            </span>
          </p>
        )}

        {/* Phần của tôi */}
        {mine && !mine.treasurer && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-item bg-muted/50 px-3 py-2.5">
            <p className="text-sm text-foreground">
              {mine.remaining > 0 ? (
                <>
                  Bạn còn thiếu <b className="tabular-nums">{formatVnd(mine.remaining)}</b>
                </>
              ) : mine.pending > 0 ? (
                <span className="flex items-center gap-1">
                  <Clock className="size-4 text-warning" aria-hidden="true" />
                  Chờ thủ quỹ xác nhận {formatVnd(mine.pending)}
                </span>
              ) : (
                'Bạn đã nộp đủ'
              )}
            </p>
            {mine.remaining > 0 &&
              (treasurer?.bank ? (
                <Button size="sm" disabled={busy} onClick={() => onContribute(mine.remaining)}>
                  <QrCode />
                  Nộp quỹ {formatVnd(mine.remaining)}
                </Button>
              ) : (
                <span className="text-xs text-muted-foreground">Thủ quỹ chưa thêm tài khoản nhận tiền</span>
              ))}
          </div>
        )}
        {mine?.treasurer && !byId.get(myUserId)?.bank && (
          <p className="text-sm text-muted-foreground">
            Bạn là thủ quỹ.{' '}
            <button
              type="button"
              className="font-semibold text-primary-strong underline-offset-4 hover:underline"
              onClick={onOpenBankProfile}
            >
              Thêm tài khoản nhận tiền
            </button>{' '}
            để mọi người quét QR nộp quỹ.
          </p>
        )}

        {/* Ai đã nộp */}
        <div className="grid gap-2">
          <button
            type="button"
            aria-expanded={open}
            aria-controls={listId}
            onClick={() => setOpen((v) => !v)}
            className="flex min-h-10 items-center gap-2 rounded-control text-left text-sm font-semibold text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring"
          >
            <ChevronDown
              className={cn('size-4 text-muted-foreground transition-transform', !open && '-rotate-90')}
              aria-hidden="true"
            />
            Xem ai đã nộp
          </button>
          <ul id={listId} hidden={!open} className="grid gap-2">
            {fund.members.map((m) => {
              const member = byId.get(m.userId)
              const name = m.userId === myUserId ? 'Bạn' : (member?.displayName ?? '?')
              return (
                <li key={m.userId} className="flex items-center gap-3 text-sm">
                  {member && (
                    <UserAvatar userId={m.userId} name={member.displayName} avatarUrl={member.avatarUrl} size="sm" />
                  )}
                  <span className="min-w-0 flex-1 font-medium break-words text-foreground">
                    {name}
                    {m.treasurer && <span className="font-normal text-muted-foreground"> · thủ quỹ</span>}
                  </span>
                  {/* Một trạng thái mỗi dòng để tên không bị cắt trên màn 360px */}
                  {m.remaining === 0 && m.pending === 0 ? (
                    <span className="shrink-0 rounded-full bg-success-soft px-2 py-0.5 text-xs font-semibold text-success-soft-foreground">
                      Đủ
                    </span>
                  ) : m.pending > 0 ? (
                    <span className="shrink-0 rounded-full bg-warning-soft px-2 py-0.5 text-xs font-semibold whitespace-nowrap text-warning-soft-foreground tabular-nums">
                      Chờ {formatVnd(m.pending)}
                    </span>
                  ) : (
                    <span className="shrink-0 text-xs whitespace-nowrap text-muted-foreground tabular-nums">
                      {formatVnd(m.contributed)} / {formatVnd(fund.perPersonTarget)}
                    </span>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}

/** OWNER, chưa bật quỹ: một dòng gợi ý. */
export function FundPrompt({ onSetup }: { onSetup: () => void }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-surface border border-dashed border-border bg-card px-4 py-3">
      <p className="flex min-w-0 flex-1 items-start gap-2 text-sm text-muted-foreground">
        <PiggyBank className="mt-0.5 size-4 shrink-0 text-primary-strong" aria-hidden="true" />
        <span>Thu trước quỹ chung? Mỗi người nộp một khoản cho một người giữ, chi tiêu chung trừ dần.</span>
      </p>
      <Button size="sm" variant="outline" onClick={onSetup}>
        Bật quỹ chung
      </Button>
    </div>
  )
}
