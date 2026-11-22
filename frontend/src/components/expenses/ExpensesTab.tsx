import { ArrowRight, Check, MoreVertical, Pencil, Plus, QrCode, Receipt, RotateCw, Trash2, X } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
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
import { tripKeys } from '@/hooks/useTrips'
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
  const qc = useQueryClient()
  /** Mở form + lấy lại danh sách thành viên ngay (có thể vừa có người vào nhóm). */
  const openForm = (expense?: ExpenseResponse) => {
    setFormFor({ expense })
    void qc.invalidateQueries({ queryKey: tripKeys.detail(tripId), exact: true })
  }
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
        <div className="rounded-3xl border-2 border-dashed border-rose-200/80 bg-card/80 p-8 text-center shadow-clay-card">
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
        {fromUserId: myUserId, toUserId, amount },
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
        {fromUserId, toUserId: myUserId, amount },
        {onSuccess: () => toast.success('Đã ghi nhận bạn nhận tiền'), onError },
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
              <Card className="rounded-[28px] border-2 border-white/80 bg-gradient-to-br from-emerald-50/90 via-sky-50/70 to-teal-50/90 shadow-clay-card">
                <CardContent className="grid gap-3 p-5 sm:p-6">
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
                      <div className="flex h-3 overflow-hidden rounded-full bg-muted/60 p-0.5 border border-white/70 shadow-clay-sunken" aria-label="Tỷ lệ theo loại chi">
                        {data.byCategory.map((c) => (
                          <div
                            key={c.category}
                            className={cn(expenseCategory(c.category).tone.split(' ')[0], 'rounded-full transition-all duration-300')}
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
                    <Card className="rounded-[28px] border-2 border-white/80 bg-card/95 shadow-clay-card">
                      <CardHeader className="p-5 pb-3">
                        <CardTitle className="text-base sm:text-lg font-bold">Thanh toán</CardTitle>
                      </CardHeader>
                        <CardContent className="grid gap-2.5 p-5 pt-0">
                          {pending.map((s) => (
                              <div key={s.id} className="flex items-center gap-2 rounded-[20px] border-2 border-amber-300 bg-amber-50/95 p-3.5 text-sm text-amber-950 shadow-clay-card">
                                <span className="min-w-0 flex-1">
                                  <b className="font-bold">{nameOf(s.fromUserId)}</b> đã chuyển <b className="font-bold text-amber-900">{formatVnd(s.amount)}</b> cho <b className="font-bold">{nameOf(s.toUserId)}</b>
                                  <span className="block text-xs font-semibold text-amber-800">Đang chờ xác nhận</span>
                                </span>
                                {s.toUserId === myUserId && (
                                      <div className="flex items-center gap-1">
                                        <Button size="sm" className="rounded-full shadow-clay-btn-primary" onClick={() => confirmSettlement.mutate(s.id, { onError })}>
                                          <Check className="size-3.5" />
                                          Xác nhận
                                        </Button>
                                        <Button
                                          size="icon-sm"
                                          variant="ghost"
                                          aria-label="Từ chối"
                                          className="rounded-full hover:bg-amber-100"
                                          onClick={() => deleteSettlement.mutate(s.id, { onError })}
                                        >
                                          <X className="size-3.5" />
                                        </Button>
                                    </div>
                )}
                                    {s.fromUserId === myUserId && (
                                        <Button size="sm" variant="ghost" className="rounded-full hover:bg-amber-100" onClick={() => deleteSettlement.mutate(s.id, { onError })}>
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
                                          className={cn(
                                            'flex items-center gap-2 rounded-[20px] border-2 border-white/80 bg-card/90 p-3.5 shadow-clay-card transition-all duration-300 hover:shadow-clay-card-hover',
                                            mine && 'bg-rose-50/90 border-rose-300',
                                          )}
                                        >
                                            <span className="flex min-w-0 flex-1 items-center gap-2 text-sm">
                                              <b className="truncate font-bold text-foreground">{nameOf(t.fromUserId)}</b>
                                              <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
                                              <b className="truncate font-bold text-foreground">{nameOf(t.toUserId)}</b>
                                            </span>
                                            <span className="font-bold text-base text-foreground">{formatVnd(t.amount)}</span>
                                            {mine && to && (
                                                <Button size="sm" className="rounded-full shadow-clay-btn-primary" onClick={() => setQr({ amount: t.amount, to, fromName: me?.displayName ?? '' })}>
                                                  <QrCode className="size-3.5" />
                                                  Trả
                                                </Button>
                  )}
                                                {t.toUserId === myUserId && (
                                                  <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="rounded-full shadow-clay-card hover:-translate-y-0.5"
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
                                                <p className="text-xs font-medium text-muted-foreground pt-1">
                                                  💡 Thêm tài khoản nhận tiền trong <b>Hồ sơ</b> để mọi người quét QR chuyển cho bạn.
                                                </p>
            )}
                                              </CardContent>
        </Card>
      )}

                                          {/* Danh sách khoản chi */}
                                              <div className="flex items-center justify-between pt-1">
                                                <h3 className="font-bold text-foreground text-base sm:text-lg">Khoản chi ({data.expenses.length})</h3>
                                                <Button size="sm" onClick={() => openForm()} className="rounded-full shadow-clay-btn-primary">
                                                  <Plus className="size-3.5" />
                                                  Thêm khoản chi
                                                </Button>
                                              </div>

                                              {data.expenses.length === 0 ? (
                                                  <p className="rounded-[28px] border-2 border-dashed border-border/80 bg-card/60 px-4 py-10 text-center text-sm font-medium text-muted-foreground shadow-clay-card">
                                                    Chưa có khoản chi nào. Ai trả gì thì ghi vào để cuối chuyến khỏi tính nhẩm nhé!
                                                  </p>
                                                  ) : (
        [...groups.entries()].map(([date, expenses]) => (
                                                  <section key={date || 'none'} className="grid gap-2">
                                                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-1">{date ? formatDate(date) : 'Không rõ ngày'}</h4>
                                                    {expenses.map((e) => {
                                                      const cat = expenseCategory(e.category)
                                                      const myShare = e.shares.find((s) => s.userId === myUserId)?.amount ?? 0
                                                      const payer = byId.get(e.paidBy)
                                                      return (
                                                            <div key={e.id} className="group flex items-center gap-3 rounded-[22px] border-2 border-white/80 bg-card/95 p-3.5 shadow-clay-card transition-all duration-300 hover:shadow-clay-card-hover">
                                                              <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-2xl border border-white/80 shadow-clay-badge transition-transform group-hover:scale-105', cat.tone)}>
                                                                <cat.icon className="size-4.5" />
                                                              </span>
                                                              <div className="min-w-0 flex-1">
                                                                  <p className="truncate font-bold text-foreground text-sm">{e.title}</p>
                                                                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium mt-0.5">
                                                                    {payer && (
                                                                      <UserAvatar userId={payer.userId} name={payer.displayName} avatarUrl={payer.avatarUrl} size="sm" />
                                                                    )}
                                                                    <span>{nameOf(e.paidBy)} trả · {e.shares.length} người</span>
                                                                    {e.splitMode === 'CUSTOM' && <span>· chia riêng</span>}
                                                                  </p>
                                                              </div>
                                                              {e.receiptUrl && (
                                                                  <a href={e.receiptUrl} target="_blank" rel="noreferrer" aria-label="Xem hóa đơn" className="text-muted-foreground hover:text-foreground hover:scale-110 transition-transform">
                                                                    <Receipt className="size-4" />
                                                                  </a>
                  )}
                                                                  <div className="text-right">
                                                                    <p className="font-bold text-foreground text-sm">{formatVnd(e.amount)}</p>
                                                                    {myShare > 0 && <p className="text-[11px] font-semibold text-muted-foreground">Bạn: {formatVnd(myShare)}</p>}
                                                                  </div>
                                                                  {e.canEdit && (
                                                                    <DropdownMenu>
                                                                      <DropdownMenuTrigger asChild>
                                                                          <Button variant="ghost" size="icon-sm" aria-label={`Tùy chọn ${e.title}`} className="rounded-full border border-white/70 bg-white/60 shadow-clay-badge hover:bg-white">
                                                                            <MoreVertical className="size-3.5" />
                                                                          </Button>
                                                                      </DropdownMenuTrigger>
                                                                      <DropdownMenuContent align="end">
                                                                        <DropdownMenuItem onSelect={() => openForm(e)}>
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
                                                                  <Card className="rounded-[28px] border-2 border-white/80 bg-card/95 shadow-clay-card">
                                                                    <CardHeader className="p-5 pb-3">
                                                                      <CardTitle className="text-base sm:text-lg font-bold">Số dư từng người</CardTitle>
                                                                    </CardHeader>
                                                                      <CardContent className="grid gap-2 p-5 pt-0">
                                                                        {data.members.map((m) => (
                                                                            <div key={m.userId} className="flex items-center gap-3 rounded-2xl border border-white/60 bg-muted/20 px-3.5 py-2 text-sm shadow-clay-badge">
                                                                              <UserAvatar userId={m.userId} name={m.displayName} avatarUrl={m.avatarUrl} size="sm" />
                                                                              <span className="min-w-0 flex-1 truncate font-semibold text-foreground">{m.userId === myUserId ? 'Bạn' : m.displayName}</span>
                                                                              <span className="text-xs font-medium text-muted-foreground">đã trả {formatVnd(m.paid)}</span>
                                                                              <span
                                                                                className={cn(
                                                                                  'w-28 text-right font-bold',
                                                                                  m.net > 0 ? 'text-emerald-700' : m.net < 0 ? 'text-rose-600' : 'text-muted-foreground',
                                                                                )}
                                                                              >
                                                                                {m.net > 0 ? '+' : ''}
                                                                                {formatVnd(m.net)}
                                                                              </span>
                                                                            </div>
            ))}
                                                                            {confirmed.length > 0 && (
              <p className="mt-1 text-xs text-muted-foreground font-medium px-1">Đã tính {confirmed.length} lần chuyển tiền đã xác nhận.</p>
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

                                                                    function Stat({label, value, tone}: {label: string; value: string; tone?: string }) {
  return (
                                                                      <div className="rounded-2xl border-2 border-white/80 bg-white/75 px-2.5 py-2.5 sm:px-3 sm:py-3 shadow-clay-card backdrop-blur-xs transition-transform hover:-translate-y-0.5">
                                                                        <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">{label}</p>
                                                                        <p className={cn('text-sm font-bold sm:text-base text-foreground mt-0.5 truncate', tone)}>{value}</p>
                                                                      </div>
                                                                      )
}
