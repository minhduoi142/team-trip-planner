import { ArrowRight, Check, MoreVertical, Pencil, Plus, QrCode, Receipt, RotateCw, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { UserAvatar } from '@/components/UserAvatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import {
  useConfirmSettlement,
  useCreateExpense,
  useCreateSettlement,
  useDeleteExpense,
  useDeleteSettlement,
  useExpenses,
  useUpdateExpense,
} from '@/hooks/useExpenses'
import { getErrorMessage } from '@/lib/api'
import { formatDate } from '@/lib/date'
import { expenseCategory, formatVnd } from '@/lib/tripContent'
import { cn } from '@/lib/utils'
import type { ExpenseRequest, ExpenseResponse, MemberBalanceResponse } from '@/types/expense'
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

export function ExpensesTab({ tripId, tripTitle, myUserId, isOwner, members }: ExpensesTabProps) {
  const summary = useExpenses(tripId)
  const create = useCreateExpense(tripId)
  const update = useUpdateExpense(tripId)
  const remove = useDeleteExpense(tripId)
  const createSettlement = useCreateSettlement(tripId)
  const confirmSettlement = useConfirmSettlement(tripId)
  const deleteSettlement = useDeleteSettlement(tripId)

  const [formFor, setFormFor] = useState<{ expense?: ExpenseResponse } | null>(null)
  const [toDelete, setToDelete] = useState<ExpenseResponse | null>(null)
  const [qr, setQr] = useState<QrTransfer | null>(null)

  if (summary.isPending) {
    return (
      <div className="grid gap-3">
        <Skeleton className="h-28 rounded-3xl" />
        <Skeleton className="h-64 rounded-3xl" />
      </div>
    )
  }
  if (summary.isError) {
    return (
      <div className="rounded-3xl border border-dashed p-8 text-center">
        <p className="text-muted-foreground">{getErrorMessage(summary.error)}</p>
        <Button variant="outline" className="mt-4" onClick={() => summary.refetch()}>
          <RotateCw />
          Thử lại
        </Button>
      </div>
    )
  }

  const data = summary.data
  const byId = new Map<number, MemberBalanceResponse>(data.members.map((m) => [m.userId, m]))
  const nameOf = (id: number) => (id === myUserId ? 'Bạn' : (byId.get(id)?.displayName ?? '?'))
  const me = byId.get(myUserId)
  const onError = (e: unknown) => toast.error(getErrorMessage(e))
  const pending = data.settlements.filter((s) => s.status === 'PENDING')
  const confirmed = data.settlements.filter((s) => s.status === 'CONFIRMED')

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

  const markReceived = (fromUserId: number, amount: number) =>
    createSettlement.mutate(
      { fromUserId, toUserId: myUserId, amount },
      { onSuccess: () => toast.success('Đã ghi nhận bạn nhận tiền'), onError },
    )

  // Nhóm khoản chi theo ngày
  const groups = new Map<string, ExpenseResponse[]>()
  for (const e of data.expenses) {
    const key = e.spentOn ?? ''
    groups.set(key, [...(groups.get(key) ?? []), e])
  }

  return (
    <div className="grid gap-4">
      {/* Tổng quan */}
      <Card className="bg-gradient-to-br from-emerald-50 to-sky-50">
        <CardContent className="grid gap-3">
          <div className="grid grid-cols-3 gap-2 text-center">
            <Stat label="Tổng chi" value={formatVnd(data.totalAmount)} />
            <Stat label="Bạn đã trả" value={formatVnd(me?.paid ?? 0)} />
            <Stat
              label={me && me.net < 0 ? 'Bạn cần trả' : 'Bạn được nhận'}
              value={formatVnd(Math.abs(me?.net ?? 0))}
              tone={me && me.net < 0 ? 'text-rose-600' : me && me.net > 0 ? 'text-emerald-700' : undefined}
            />
          </div>
          {data.byCategory.length > 0 && (
            <div className="flex h-2 overflow-hidden rounded-full bg-muted" aria-label="Tỷ lệ theo loại chi">
              {data.byCategory.map((c) => (
                <div
                  key={c.category}
                  className={expenseCategory(c.category).tone.split(' ')[0]}
                  style={{ width: `${(c.amount / data.totalAmount) * 100}%` }}
                  title={`${expenseCategory(c.category).label}: ${formatVnd(c.amount)}`}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Thanh toán */}
      {(data.transfers.length > 0 || pending.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle>Thanh toán</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            {pending.map((s) => (
              <div key={s.id} className="flex items-center gap-2 rounded-2xl bg-amber-50 px-3 py-2.5 text-sm ring-1 ring-amber-200">
                <span className="min-w-0 flex-1">
                  <b>{nameOf(s.fromUserId)}</b> đã chuyển <b>{formatVnd(s.amount)}</b> cho <b>{nameOf(s.toUserId)}</b>
                  <span className="block text-xs text-amber-800">Đang chờ xác nhận</span>
                </span>
                {s.toUserId === myUserId && (
                  <>
                    <Button size="sm" onClick={() => confirmSettlement.mutate(s.id, { onError })}>
                      <Check />
                      Xác nhận
                    </Button>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      aria-label="Từ chối"
                      onClick={() => deleteSettlement.mutate(s.id, { onError })}
                    >
                      <X />
                    </Button>
                  </>
                )}
                {s.fromUserId === myUserId && (
                  <Button size="sm" variant="ghost" onClick={() => deleteSettlement.mutate(s.id, { onError })}>
                    Hủy
                  </Button>
                )}
              </div>
            ))}

            {data.transfers.map((t) => {
              const to = byId.get(t.toUserId)
              const mine = t.fromUserId === myUserId
              return (
                <div
                  key={`${t.fromUserId}-${t.toUserId}`}
                  className={cn('flex items-center gap-2 rounded-2xl px-3 py-2.5 ring-1 ring-border', mine && 'bg-rose-50')}
                >
                  <span className="flex min-w-0 flex-1 items-center gap-1.5 text-sm">
                    <b className="truncate">{nameOf(t.fromUserId)}</b>
                    <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
                    <b className="truncate">{nameOf(t.toUserId)}</b>
                  </span>
                  <span className="font-semibold">{formatVnd(t.amount)}</span>
                  {mine && to && (
                    <Button size="sm" onClick={() => setQr({ amount: t.amount, to, fromName: me?.displayName ?? '' })}>
                      <QrCode />
                      Trả
                    </Button>
                  )}
                  {t.toUserId === myUserId && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={createSettlement.isPending}
                      onClick={() => markReceived(t.fromUserId, t.amount)}
                    >
                      Đã nhận
                    </Button>
                  )}
                </div>
              )
            })}
            {!me?.bank && data.transfers.some((t) => t.toUserId === myUserId) && (
              <p className="text-xs text-muted-foreground">
                💡 Thêm tài khoản nhận tiền trong <b>Hồ sơ</b> để mọi người quét QR chuyển cho bạn.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Danh sách khoản chi */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Khoản chi ({data.expenses.length})</h3>
        <Button size="sm" onClick={() => setFormFor({})}>
          <Plus />
          Thêm khoản chi
        </Button>
      </div>

      {data.expenses.length === 0 ? (
        <p className="rounded-2xl bg-muted/50 px-4 py-8 text-center text-sm text-muted-foreground">
          Chưa có khoản chi nào. Ai trả gì thì ghi vào để cuối chuyến khỏi tính nhẩm nhé!
        </p>
      ) : (
        [...groups.entries()].map(([date, expenses]) => (
          <section key={date || 'none'} className="grid gap-2">
            <h4 className="text-sm text-muted-foreground">{date ? formatDate(date) : 'Không rõ ngày'}</h4>
            {expenses.map((e) => {
              const cat = expenseCategory(e.category)
              const myShare = e.shares.find((s) => s.userId === myUserId)?.amount ?? 0
              const payer = byId.get(e.paidBy)
              return (
                <div key={e.id} className="flex items-center gap-3 rounded-2xl bg-card px-3 py-2.5 ring-1 ring-border">
                  <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-xl', cat.tone)}>
                    <cat.icon className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{e.title}</p>
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      {payer && (
                        <UserAvatar userId={payer.userId} name={payer.displayName} avatarUrl={payer.avatarUrl} size="sm" />
                      )}
                      {nameOf(e.paidBy)} trả · {e.shares.length} người
                      {e.splitMode === 'CUSTOM' && ' · chia riêng'}
                    </p>
                  </div>
                  {e.receiptUrl && (
                    <a href={e.receiptUrl} target="_blank" rel="noreferrer" aria-label="Xem hóa đơn" className="text-muted-foreground">
                      <Receipt className="size-4" />
                    </a>
                  )}
                  <div className="text-right">
                    <p className="font-semibold">{formatVnd(e.amount)}</p>
                    {myShare > 0 && <p className="text-xs text-muted-foreground">Bạn: {formatVnd(myShare)}</p>}
                  </div>
                  {e.canEdit && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm" aria-label={`Tùy chọn ${e.title}`}>
                          <MoreVertical />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => setFormFor({ expense: e })}>
                          <Pencil />
                          Sửa
                        </DropdownMenuItem>
                        <DropdownMenuItem variant="destructive" onSelect={() => setToDelete(e)}>
                          <Trash2 />
                          Xóa
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              )
            })}
          </section>
        ))
      )}

      {/* Số dư từng người */}
      {data.expenses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Số dư từng người</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            {data.members.map((m) => (
              <div key={m.userId} className="flex items-center gap-3 text-sm">
                <UserAvatar userId={m.userId} name={m.displayName} avatarUrl={m.avatarUrl} size="sm" />
                <span className="min-w-0 flex-1 truncate">{m.userId === myUserId ? 'Bạn' : m.displayName}</span>
                <span className="text-xs text-muted-foreground">đã trả {formatVnd(m.paid)}</span>
                <span
                  className={cn(
                    'w-28 text-right font-semibold',
                    m.net > 0 ? 'text-emerald-700' : m.net < 0 ? 'text-rose-600' : 'text-muted-foreground',
                  )}
                >
                  {m.net > 0 ? '+' : ''}
                  {formatVnd(m.net)}
                </span>
              </div>
            ))}
            {confirmed.length > 0 && (
              <p className="mt-1 text-xs text-muted-foreground">Đã tính {confirmed.length} lần chuyển tiền đã xác nhận.</p>
            )}
          </CardContent>
        </Card>
      )}

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
        description={toDelete ? `"${toDelete.title}" (${formatVnd(toDelete.amount)}) sẽ bị xóa, số dư được tính lại.` : ''}
        confirmLabel="Xóa"
        destructive
        pending={remove.isPending}
        onConfirm={() => toDelete && remove.mutate(toDelete.id, { onSuccess: () => setToDelete(null), onError })}
      />
    </div>
  )
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-2xl bg-background/70 px-2 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn('text-sm font-bold sm:text-base', tone)}>{value}</p>
    </div>
  )
}
