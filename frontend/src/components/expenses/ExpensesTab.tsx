import dayjs from 'dayjs'
import {
  ArrowRight,
  Check,
  ChevronDown,
  Clock,
  Info,
  Pencil,
  Plus,
  QrCode,
  Receipt,
  Trash2,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { useId, useRef, useState, type ReactNode } from 'react'
import { useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { UserAvatar } from '@/components/UserAvatar'
import { RowMenuButton } from '@/components/common/layout'
import { EmptyState, TabErrorState, TabSkeleton } from '@/components/common/states'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  useConfirmSettlement,
  useCreateExpense,
  useCreateSettlement,
  useDeleteExpense,
  useDeleteSettlement,
  useExpenses,
  useUpdateExpense,
} from '@/hooks/useExpenses'
import { tripKeys } from '@/hooks/useTrips'
import { getErrorMessage } from '@/lib/api'
import { formatDate } from '@/lib/date'
import { expenseCategory, formatVnd } from '@/lib/tripContent'
import { cn } from '@/lib/utils'
import type {
  ExpenseRequest,
  ExpenseResponse,
  MemberBalanceResponse,
  SettlementResponse,
  TransferResponse,
} from '@/types/expense'
import type { TripMemberResponse } from '@/types/trip'
import { ExpenseFormDialog } from './ExpenseFormDialog'
import { TransferQrDialog, type QrTransfer } from './TransferQrDialog'

interface ExpensesTabProps {
  tripId: number
  tripTitle: string
  myUserId: number
  /** Chỉ Trưởng nhóm được ghi hộ người khác (chọn người trả khác mình) */
  isOwner: boolean
  members: TripMemberResponse[]
}

/** Thao tác chuyển tiền cần hỏi lại trước khi gửi (P3-CP-09, P3-CP-10). */
type SettleAction =
  | { kind: 'confirm' | 'reject' | 'cancel' | 'deleteConfirmed'; settlement: SettlementResponse }
  | { kind: 'received'; fromUserId: number; amount: number }

export function ExpensesTab({ tripId, tripTitle, myUserId, isOwner, members }: ExpensesTabProps) {
  const summary = useExpenses(tripId)
  const create = useCreateExpense(tripId)
  const update = useUpdateExpense(tripId)
  const remove = useDeleteExpense(tripId)
  const createSettlement = useCreateSettlement(tripId)
  const confirmSettlement = useConfirmSettlement(tripId)
  const deleteSettlement = useDeleteSettlement(tripId)
  const [, setParams] = useSearchParams()

  const [formFor, setFormFor] = useState<{ expense?: ExpenseResponse } | null>(null)
  const qc = useQueryClient()
  /** Mở form + lấy lại danh sách thành viên ngay (có thể vừa có người vào nhóm). */
  const openForm = (expense?: ExpenseResponse) => {
    setFormFor({ expense })
    void qc.invalidateQueries({ queryKey: tripKeys.detail(tripId), exact: true })
  }
  const [toDelete, setToDelete] = useState<ExpenseResponse | null>(null)
  const [qr, setQr] = useState<QrTransfer | null>(null)
  const [action, setAction] = useState<SettleAction | null>(null)
  /** Mở Hồ sơ → Nhận tiền (AppLayout mở dialog theo `?profile=`). */
  const openBankProfile = () =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.set('profile', 'bank')
        return next
      },
      { replace: true },
    )
  const todoRef = useRef<HTMLElement>(null)

  if (summary.isPending) return <TabSkeleton rows={4} />
  if (summary.isError) return <TabErrorState error={summary.error} onRetry={() => summary.refetch()} />

  const data = summary.data
  const byId = new Map<number, MemberBalanceResponse>(data.members.map((m) => [m.userId, m]))
  const nameOf = (id: number) => (id === myUserId ? 'Bạn' : (byId.get(id)?.displayName ?? '?'))
  const me = byId.get(myUserId)
  const net = me?.net ?? 0
  const onError = (e: unknown) => toast.error(getErrorMessage(e))
  const pending = data.settlements.filter((s) => s.status === 'PENDING')
  const confirmed = data.settlements.filter((s) => s.status === 'CONFIRMED')
  const involvesMe = (from: number, to: number) => from === myUserId || to === myUserId
  // Việc của tôi lên trước (P3-CP-04)
  const sortedPending = [...pending].sort(
    (a, b) => Number(involvesMe(b.fromUserId, b.toUserId)) - Number(involvesMe(a.fromUserId, a.toUserId)),
  )
  const sortedTransfers = [...data.transfers].sort(
    (a, b) => Number(involvesMe(b.fromUserId, b.toUserId)) - Number(involvesMe(a.fromUserId, a.toUserId)),
  )
  const hasMyTodo =
    data.transfers.some((t) => involvesMe(t.fromUserId, t.toUserId)) ||
    pending.some((s) => involvesMe(s.fromUserId, s.toUserId))
  const settlementBusy = createSettlement.isPending || confirmSettlement.isPending || deleteSettlement.isPending

  const submitExpense = async (body: ExpenseRequest) => {
    if (formFor?.expense) {
      await update.mutateAsync({ id: formFor.expense.id, body })
      toast.success('Đã lưu khoản chi')
    } else {
      await create.mutateAsync(body)
      toast.success('Đã thêm khoản chi')
    }
    setFormFor(null)
  }

  const markSent = (toUserId: number, amount: number, onDone?: () => void) =>
    createSettlement.mutate(
      { fromUserId: myUserId, toUserId, amount },
      {
        onSuccess: () => {
          onDone?.()
          toast.success(`Đã báo chuyển, chờ ${nameOf(toUserId)} xác nhận`)
        },
        onError,
      },
    )

  const runAction = () => {
    if (!action) return
    const done = { onSuccess: () => setAction(null), onError }
    switch (action.kind) {
      case 'received':
        createSettlement.mutate(
          { fromUserId: action.fromUserId, toUserId: myUserId, amount: action.amount },
          {
            onSuccess: () => {
              setAction(null)
              toast.success('Đã ghi nhận bạn nhận tiền')
            },
            onError,
          },
        )
        return
      case 'confirm':
        confirmSettlement.mutate(action.settlement.id, done)
        return
      default:
        deleteSettlement.mutate(action.settlement.id, done)
    }
  }

  const actionCopy = (a: SettleAction): { title: string; description: string; label: string; destructive: boolean } => {
    if (a.kind === 'received') {
      return {
        title: 'Xác nhận đã nhận tiền?',
        description: `Ghi nhận bạn đã nhận ${formatVnd(a.amount)} từ ${nameOf(a.fromUserId)} (vd tiền mặt). Số dư được tính lại ngay.`,
        label: 'Đã nhận',
        destructive: false,
      }
    }
    const s = a.settlement
    const amount = formatVnd(s.amount)
    switch (a.kind) {
      case 'confirm':
        return {
          title: 'Xác nhận đã nhận tiền?',
          description: `${nameOf(s.fromUserId)} báo đã chuyển cho bạn ${amount}. Chỉ xác nhận khi tiền đã vào tài khoản.`,
          label: 'Xác nhận',
          destructive: false,
        }
      case 'reject':
        return {
          title: 'Từ chối lần chuyển này?',
          description: `Bạn chưa nhận được ${amount} từ ${nameOf(s.fromUserId)}. Lần báo chuyển sẽ bị xóa.`,
          label: 'Từ chối',
          destructive: true,
        }
      case 'cancel':
        return {
          title: 'Hủy báo chuyển?',
          description: `Lần báo chuyển ${amount} cho ${nameOf(s.toUserId)} sẽ bị xóa.`,
          label: 'Hủy báo chuyển',
          destructive: true,
        }
      default:
        return {
          title: 'Hủy lần chuyển đã xác nhận?',
          description: `Lần ${nameOf(s.fromUserId)} chuyển ${amount} cho bạn sẽ bị xóa, số dư được tính lại.`,
          label: 'Hủy lần chuyển',
          destructive: true,
        }
    }
  }

  const dialogs = (
    <>
      <ExpenseFormDialog
        open={formFor !== null}
        onOpenChange={(open) => !open && setFormFor(null)}
        expense={formFor?.expense}
        members={members}
        myUserId={myUserId}
        canChoosePayer={isOwner}
        pending={create.isPending || update.isPending}
        onSubmit={submitExpense}
      />
      <TransferQrDialog
        transfer={qr}
        tripTitle={tripTitle}
        pending={createSettlement.isPending}
        onOpenChange={(open) => !open && setQr(null)}
        onMarkSent={() => qr && markSent(qr.to.userId, qr.amount, () => setQr(null))}
      />
      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(open) => !open && setToDelete(null)}
        title="Xóa khoản chi này?"
        description={
          toDelete ? `"${toDelete.title}" (${formatVnd(toDelete.amount)}) sẽ bị xóa, số dư được tính lại.` : ''
        }
        confirmLabel="Xóa"
        destructive
        pending={remove.isPending}
        onConfirm={() => toDelete && remove.mutate(toDelete.id, { onSuccess: () => setToDelete(null), onError })}
      />
      {action && (
        <ConfirmDialog
          open
          onOpenChange={(open) => !open && setAction(null)}
          title={actionCopy(action).title}
          description={actionCopy(action).description}
          confirmLabel={actionCopy(action).label}
          destructive={actionCopy(action).destructive}
          pending={settlementBusy}
          onConfirm={runAction}
        />
      )}
    </>
  )

  // P3-CP-14: chưa có gì thì chỉ hiện trạng thái rỗng, không hiện "0 ₫"
  if (data.expenses.length === 0 && data.settlements.length === 0) {
    return (
      <div className="grid gap-4">
        <EmptyState
          icon={Wallet}
          title="Chưa có khoản chi nào"
          description="Ai trả gì thì ghi vào, app tự tính ai cần chuyển cho ai."
          action={
            <Button onClick={() => openForm()}>
              <Plus />
              Thêm khoản chi
            </Button>
          }
        />
        {dialogs}
      </div>
    )
  }

  // Nhóm khoản chi theo ngày
  const groups = new Map<string, ExpenseResponse[]>()
  for (const e of data.expenses) {
    const key = e.spentOn ?? ''
    groups.set(key, [...(groups.get(key) ?? []), e])
  }
  const topCategories = [...data.byCategory].sort((a, b) => b.amount - a.amount).slice(0, 3)
  const otherCategories = data.byCategory.length - topCategories.length

  return (
    <div className="grid gap-4">
      {/* Số dư của tôi (P3-CP-02) */}
      <Card className="py-0">
        <CardContent className="grid gap-4 p-5 sm:p-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="min-w-0">
              {net === 0 ? (
                <p className="text-2xl font-bold text-foreground">Bạn đã cân bằng</p>
              ) : (
                <>
                  <p className="text-sm font-medium text-muted-foreground">
                    {net < 0 ? 'Bạn cần trả' : 'Bạn được nhận'}
                  </p>
                  <p
                    className={cn(
                      'text-2xl font-bold whitespace-nowrap tabular-nums',
                      net < 0 ? 'text-money-out' : 'text-money-in',
                    )}
                  >
                    {net < 0 ? '−' : '+'}
                    {formatVnd(Math.abs(net))}
                  </p>
                </>
              )}
              <p className="mt-1 text-sm text-muted-foreground">
                Tổng chi{' '}
                <span className="font-semibold text-foreground tabular-nums">{formatVnd(data.totalAmount)}</span>
                {' · '}Bạn đã trả{' '}
                <span className="font-semibold text-foreground tabular-nums">{formatVnd(me?.paid ?? 0)}</span>
              </p>
            </div>
            {hasMyTodo && (
              <Button
                variant="outline"
                onClick={() => todoRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              >
                {net < 0 ? 'Xem cách trả' : 'Xem việc cần làm'}
              </Button>
            )}
          </div>

          {/* Top 3 loại chi (P3-CP-08) */}
          {topCategories.length > 0 && data.totalAmount > 0 && (
            <ul className="grid gap-2" aria-label="Chi nhiều nhất theo loại">
              {topCategories.map((c) => {
                const cat = expenseCategory(c.category)
                return (
                  <li key={c.category} className="flex items-center gap-3 text-sm">
                    <CategoryIcon icon={cat.icon} tone={cat.tone} />
                    <span className="min-w-0 flex-1 truncate font-medium text-foreground">{cat.label}</span>
                    <span className="font-semibold whitespace-nowrap text-foreground tabular-nums">
                      {formatVnd(c.amount)}
                    </span>
                    <span className="w-10 text-right text-xs text-muted-foreground tabular-nums">
                      {Math.round((c.amount / data.totalAmount) * 100)}%
                    </span>
                  </li>
                )
              })}
              {otherCategories > 0 && <li className="text-xs text-muted-foreground">+ {otherCategories} loại khác</li>}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Việc cần làm: Trả / Xác nhận (P3-CP-01, P3-CP-05) */}
      {(data.transfers.length > 0 || pending.length > 0) && (
        <section ref={todoRef} aria-labelledby="exp-todo" className="grid scroll-mt-32 gap-2">
          <h3 id="exp-todo" className="px-1 text-base font-bold text-foreground sm:text-lg">
            Thanh toán
          </h3>
          <Card className="py-0">
            <ul className="divide-y divide-border">
              {sortedPending.map((s) => (
                <PendingRow
                  key={`p-${s.id}`}
                  settlement={s}
                  myUserId={myUserId}
                  nameOf={nameOf}
                  busy={settlementBusy}
                  onAction={setAction}
                />
              ))}
              {sortedTransfers.map((t) => (
                <TransferRow
                  key={`t-${t.fromUserId}-${t.toUserId}`}
                  transfer={t}
                  myUserId={myUserId}
                  nameOf={nameOf}
                  busy={settlementBusy}
                  onPay={(remaining) => {
                    const to = byId.get(t.toUserId)
                    if (to) setQr({ amount: remaining, to, fromName: me?.displayName ?? '' })
                  }}
                  onReceived={(amount) => setAction({ kind: 'received', fromUserId: t.fromUserId, amount })}
                />
              ))}
            </ul>
          </Card>
          {!me?.bank && data.transfers.some((t) => t.toUserId === myUserId) && (
            <p className="flex items-start gap-2 px-1 text-sm text-muted-foreground">
              <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <span>
                <button
                  type="button"
                  className="font-semibold text-primary-strong underline-offset-4 hover:underline"
                  onClick={openBankProfile}
                >
                  Thêm tài khoản nhận tiền
                </button>{' '}
                trong Hồ sơ để mọi người quét QR chuyển cho bạn.
              </span>
            </p>
          )}
        </section>
      )}

      {/* Số dư từng người (P3-CP-03) */}
      {data.expenses.length > 0 && (
        <Collapsible title="Số dư từng người" defaultOpen>
          <Card className="py-0">
            <ul className="divide-y divide-border">
              {data.members.map((m) => (
                <li key={m.userId} className="flex items-center gap-3 px-4 py-3">
                  <UserAvatar userId={m.userId} name={m.displayName} avatarUrl={m.avatarUrl} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="min-w-0 truncate text-sm font-semibold text-foreground">
                        {m.userId === myUserId ? 'Bạn' : m.displayName}
                      </span>
                      <span
                        className={cn(
                          'text-sm font-bold whitespace-nowrap tabular-nums',
                          m.net > 0 ? 'text-money-in' : m.net < 0 ? 'text-money-out' : 'text-muted-foreground',
                        )}
                      >
                        {m.net > 0 ? '+' : m.net < 0 ? '−' : ''}
                        {formatVnd(Math.abs(m.net))}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground tabular-nums">đã trả {formatVnd(m.paid)}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </Collapsible>
      )}

      {/* Lịch sử chuyển tiền đã xác nhận (P3-CP-10) */}
      {confirmed.length > 0 && (
        <Collapsible title="Lịch sử chuyển tiền" count={confirmed.length}>
          <Card className="py-0">
            <ul className="divide-y divide-border">
              {confirmed.map((s) => (
                <li key={s.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="flex min-w-0 items-center gap-1.5 text-sm">
                      <span className="truncate font-semibold text-foreground">{nameOf(s.fromUserId)}</span>
                      <ArrowRight className="size-4 shrink-0 text-muted-foreground" aria-label="chuyển cho" />
                      <span className="truncate font-semibold text-foreground">{nameOf(s.toUserId)}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {dayjs(s.confirmedAt ?? s.createdAt).format('DD/MM/YYYY HH:mm')}
                    </p>
                  </div>
                  <span className="text-sm font-bold whitespace-nowrap text-foreground tabular-nums">
                    {formatVnd(s.amount)}
                  </span>
                  {s.toUserId === myUserId && (
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={settlementBusy}
                      onClick={() => setAction({ kind: 'deleteConfirmed', settlement: s })}
                    >
                      Hủy
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          </Card>
        </Collapsible>
      )}

      {/* Danh sách khoản chi */}
      <div className="flex items-center justify-between gap-2 pt-1">
        <h3 className="px-1 text-base font-bold text-foreground sm:text-lg">Khoản chi ({data.expenses.length})</h3>
        <Button size="sm" onClick={() => openForm()}>
          <Plus />
          Thêm khoản chi
        </Button>
      </div>

      {data.expenses.length === 0 ? (
        <EmptyState icon={Receipt} title="Chưa có khoản chi nào" description="Ai trả gì thì ghi vào nhé." />
      ) : (
        [...groups.entries()].map(([date, expenses]) => (
          <Collapsible
            key={date || 'none'}
            title={date ? formatDate(date) : 'Không rõ ngày'}
            count={expenses.length}
            meta={formatVnd(expenses.reduce((sum, e) => sum + e.amount, 0))}
            defaultOpen
            small
          >
            <Card className="py-0">
              <ul className="divide-y divide-border">
                {expenses.map((e) => (
                  <ExpenseRow
                    key={e.id}
                    expense={e}
                    myUserId={myUserId}
                    payer={byId.get(e.paidBy)}
                    payerName={nameOf(e.paidBy)}
                    onEdit={() => openForm(e)}
                    onDelete={() => setToDelete(e)}
                  />
                ))}
              </ul>
            </Card>
          </Collapsible>
        ))
      )}

      {dialogs}
    </div>
  )
}

function CategoryIcon({ icon: Icon, tone }: { icon: LucideIcon; tone: string }) {
  return (
    <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-control', tone)} aria-hidden="true">
      <Icon className="size-4.5" />
    </span>
  )
}

/** Khối thu gọn được: nút tiêu đề có aria-expanded. */
function Collapsible({
  title,
  count,
  meta,
  defaultOpen = false,
  small = false,
  children,
}: {
  title: string
  count?: number
  meta?: string
  defaultOpen?: boolean
  small?: boolean
  children: ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  const id = useId()
  return (
    <section className="grid gap-2">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((v) => !v)}
        className="flex min-h-11 items-center gap-2 rounded-control px-1 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring"
      >
        <ChevronDown
          className={cn('size-4 shrink-0 text-muted-foreground transition-transform', !open && '-rotate-90')}
          aria-hidden="true"
        />
        <span
          className={cn(
            'min-w-0 flex-1 truncate font-bold text-foreground',
            small ? 'text-sm' : 'text-base sm:text-lg',
          )}
        >
          {title}
          {count !== undefined && <span className="font-medium text-muted-foreground"> ({count})</span>}
        </span>
        {meta && <span className="text-sm whitespace-nowrap text-muted-foreground tabular-nums">{meta}</span>}
      </button>
      <div id={id} hidden={!open}>
        {children}
      </div>
    </section>
  )
}

function PendingRow({
  settlement: s,
  myUserId,
  nameOf,
  busy,
  onAction,
}: {
  settlement: SettlementResponse
  myUserId: number
  nameOf: (id: number) => string
  busy: boolean
  onAction: (action: SettleAction) => void
}) {
  const toMe = s.toUserId === myUserId
  const fromMe = s.fromUserId === myUserId
  return (
    <li className={cn('flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3', (toMe || fromMe) && 'bg-primary/5')}>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-foreground">
          <b className="font-semibold">{nameOf(s.fromUserId)}</b> đã chuyển{' '}
          <b className="font-bold whitespace-nowrap tabular-nums">{formatVnd(s.amount)}</b> cho{' '}
          <b className="font-semibold">{nameOf(s.toUserId)}</b>
        </p>
        <p className="mt-0.5 flex items-center gap-1 text-xs font-medium text-warning-soft-foreground">
          <Clock className="size-3.5" aria-hidden="true" />
          Đang chờ {toMe ? 'bạn' : nameOf(s.toUserId)} xác nhận
        </p>
      </div>
      {toMe && (
        <div className="flex items-center gap-1">
          <Button size="sm" variant="ghost" disabled={busy} onClick={() => onAction({ kind: 'reject', settlement: s })}>
            Từ chối
          </Button>
          <Button size="sm" disabled={busy} onClick={() => onAction({ kind: 'confirm', settlement: s })}>
            <Check />
            Xác nhận
          </Button>
        </div>
      )}
      {fromMe && (
        <Button size="sm" variant="ghost" disabled={busy} onClick={() => onAction({ kind: 'cancel', settlement: s })}>
          Hủy
        </Button>
      )}
    </li>
  )
}

function TransferRow({
  transfer: t,
  myUserId,
  nameOf,
  busy,
  onPay,
  onReceived,
}: {
  transfer: TransferResponse
  myUserId: number
  nameOf: (id: number) => string
  busy: boolean
  onPay: (remaining: number) => void
  onReceived: (amount: number) => void
}) {
  const remaining = Math.max(0, t.amount - t.pendingAmount)
  const fromMe = t.fromUserId === myUserId
  const toMe = t.toUserId === myUserId
  return (
    <li className={cn('flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3', (fromMe || toMe) && 'bg-primary/5')}>
      <div className="min-w-0 flex-1">
        <p className="flex min-w-0 items-center gap-1.5 text-sm">
          <span className="truncate font-semibold text-foreground">{nameOf(t.fromUserId)}</span>
          <ArrowRight className="size-4 shrink-0 text-muted-foreground" aria-label="cần chuyển cho" />
          <span className="truncate font-semibold text-foreground">{nameOf(t.toUserId)}</span>
        </p>
        {t.pendingAmount > 0 && remaining > 0 && (
          <p className="text-xs text-muted-foreground tabular-nums">
            Còn {formatVnd(remaining)} · {formatVnd(t.pendingAmount)} đang chờ xác nhận
          </p>
        )}
      </div>
      <span className="text-base font-bold whitespace-nowrap text-foreground tabular-nums">
        {formatVnd(remaining > 0 ? remaining : t.amount)}
      </span>
      {remaining === 0 ? (
        <span className="flex items-center gap-1 rounded-full bg-warning-soft px-2.5 py-1 text-xs font-semibold text-warning-soft-foreground">
          <Clock className="size-3.5" aria-hidden="true" />
          Đang chờ xác nhận
        </span>
      ) : fromMe ? (
        <Button size="sm" disabled={busy} onClick={() => onPay(remaining)}>
          <QrCode />
          Trả
        </Button>
      ) : toMe && t.pendingAmount === 0 ? (
        <Button size="sm" variant="outline" disabled={busy} onClick={() => onReceived(remaining)}>
          Đã nhận
        </Button>
      ) : null}
    </li>
  )
}

function ExpenseRow({
  expense: e,
  myUserId,
  payer,
  payerName,
  onEdit,
  onDelete,
}: {
  expense: ExpenseResponse
  myUserId: number
  payer: MemberBalanceResponse | undefined
  payerName: string
  onEdit: () => void
  onDelete: () => void
}) {
  const cat = expenseCategory(e.category)
  const myShare = e.shares.find((s) => s.userId === myUserId)?.amount ?? 0
  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <CategoryIcon icon={cat.icon} tone={cat.tone} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">{e.title}</p>
        <p className="mt-0.5 flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
          {payer && <UserAvatar userId={payer.userId} name={payer.displayName} avatarUrl={payer.avatarUrl} size="sm" />}
          <span className="truncate">
            {payerName} trả · {e.shares.length} người{e.splitMode === 'CUSTOM' && ' · chia riêng'}
          </span>
        </p>
      </div>
      <div className="text-right">
        <p className="text-sm font-bold whitespace-nowrap text-foreground tabular-nums">{formatVnd(e.amount)}</p>
        {myShare > 0 && (
          <p className="text-xs whitespace-nowrap text-muted-foreground tabular-nums">Bạn: {formatVnd(myShare)}</p>
        )}
      </div>
      {(e.canEdit || e.receiptUrl) && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <RowMenuButton label={`Tùy chọn cho ${e.title}`} />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {e.receiptUrl && (
              <DropdownMenuItem asChild>
                <a href={e.receiptUrl} target="_blank" rel="noreferrer">
                  <Receipt />
                  Xem hóa đơn
                </a>
              </DropdownMenuItem>
            )}
            {e.receiptUrl && e.canEdit && <DropdownMenuSeparator />}
            {e.canEdit && (
              <>
                <DropdownMenuItem onSelect={onEdit}>
                  <Pencil />
                  Sửa
                </DropdownMenuItem>
                <DropdownMenuItem variant="destructive" onSelect={onDelete}>
                  <Trash2 />
                  Xóa
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </li>
  )
}
