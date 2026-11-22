import dayjs from 'dayjs'
import { X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { FormField } from '@/components/FormField'
import { ImageUploadButton } from '@/components/ImageUploadButton'
import { UserAvatar } from '@/components/UserAvatar'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getErrorMessage, getFieldErrors } from '@/lib/api'
import { EXPENSE_CATEGORIES, formatVnd } from '@/lib/tripContent'
import { cn } from '@/lib/utils'
import type { ExpenseCategory, ExpenseRequest, ExpenseResponse, SplitMode } from '@/types/expense'
import type { TripMemberResponse } from '@/types/trip'

interface ExpenseFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  expense?: ExpenseResponse
  members: TripMemberResponse[]
  myUserId: number
  /** Chỉ Trưởng nhóm được chọn người trả khác mình (ghi hộ) */
  canChoosePayer: boolean
  pending: boolean
  onSubmit: (body: ExpenseRequest) => Promise<unknown>
}

export function ExpenseFormDialog(props: ExpenseFormDialogProps) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="max-h-[92svh] overflow-y-auto sm:max-w-lg">
        {props.open && <ExpenseForm key={props.expense?.id ?? 'new'} {...props} />}
      </DialogContent>
    </Dialog>
  )
}

const digitsOnly = (value: string) => value.replace(/\D/g, '').slice(0, 10)
const fmt = (value: string) => (value ? Number(value).toLocaleString('vi-VN') : '')

function ExpenseForm({
  expense,
  members,
  myUserId,
  canChoosePayer,
  pending,
  onSubmit,
  onOpenChange,
}: ExpenseFormDialogProps) {
  const [title, setTitle] = useState(expense?.title ?? '')
  const [category, setCategory] = useState<ExpenseCategory>(expense?.category ?? 'FOOD')
  const [amount, setAmount] = useState(expense ? String(expense.amount) : '')
  const [paidBy, setPaidBy] = useState(String(expense?.paidBy ?? myUserId))
  const [spentOn, setSpentOn] = useState(expense?.spentOn ?? dayjs().format('YYYY-MM-DD'))
  const [mode, setMode] = useState<SplitMode>(expense?.splitMode ?? 'EQUAL')
  // Khoản chi mới: mặc định chia cho MỌI thành viên, kể cả người vừa vào nhóm khi form đang mở
  // (members được làm mới ở nền) → lưu danh sách người bị BỎ RA. Sửa khoản chi: giữ đúng người đã chia.
  const [selection, setSelection] = useState<{ kind: 'exclude' | 'include'; ids: number[] }>(() =>
    expense ? { kind: 'include', ids: expense.shares.map((s) => s.userId) } : { kind: 'exclude', ids: [] },
  )
  const participants =
    selection.kind === 'include'
      ? selection.ids
      : members.map((m) => m.userId).filter((id) => !selection.ids.includes(id))
  const [custom, setCustom] = useState<Record<number, string>>(() =>
    Object.fromEntries((expense?.shares ?? []).map((s) => [s.userId, String(s.amount)])),
  )
  const [note, setNote] = useState(expense?.note ?? '')
  const [receiptUrl, setReceiptUrl] = useState(expense?.receiptUrl ?? '')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const total = Number(amount || 0)
  const customSum = Object.values(custom).reduce((sum, v) => sum + Number(v || 0), 0)
  const diff = total - customSum

  const toggleParticipant = (userId: number) =>
    setSelection((prev) => ({
      ...prev,
      ids: prev.ids.includes(userId) ? prev.ids.filter((id) => id !== userId) : [...prev.ids, userId],
    }))

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const clientErrors: Record<string, string> = {}
    if (!title.trim()) clientErrors.title = 'Nhập nội dung khoản chi'
    if (total <= 0) clientErrors.amount = 'Nhập số tiền'
    if (mode === 'EQUAL' && participants.length === 0) clientErrors.participants = 'Chọn ít nhất 1 người'
    if (mode === 'CUSTOM' && diff !== 0) clientErrors.participants = 'Tổng các phần phải bằng số tiền'
    setErrors(clientErrors)
    if (Object.keys(clientErrors).length > 0) return

    try {
      await onSubmit({
        title: title.trim(),
        category,
        amount: total,
        paidBy: Number(paidBy),
        spentOn: spentOn || null,
        splitMode: mode,
        participantIds: mode === 'EQUAL' ? participants : null,
        shares:
          mode === 'CUSTOM'
            ? Object.entries(custom)
              .filter(([, v]) => Number(v || 0) > 0)
              .map(([userId, v]) => ({ userId: Number(userId), amount: Number(v) }))
            : null,
        note: note.trim() || null,
        receiptUrl: receiptUrl || null,
      })
    } catch (error) {
      const fieldErrors = getFieldErrors(error)
      setErrors(fieldErrors)
      if (Object.keys(fieldErrors).length === 0) toast.error(getErrorMessage(error))
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-5" noValidate>
      <DialogHeader>
        <DialogTitle>{expense ? 'Sửa khoản chi' : 'Thêm khoản chi'}</DialogTitle>
        <DialogDescription>Ghi ai đã trả, app tự tính ai cần chuyển cho ai.</DialogDescription>
      </DialogHeader>

      <FormField id="exp-amount" label="Số tiền (₫)" error={errors.amount}>
        <Input
          id="exp-amount"
          autoFocus
          inputMode="numeric"
          placeholder="VD: 1.200.000"
          className="text-xl font-bold tracking-tight text-foreground"
          value={fmt(amount)}
          aria-invalid={Boolean(errors.amount)}
          onChange={(e) => setAmount(digitsOnly(e.target.value))}
        />
      </FormField>

      <FormField id="exp-title" label="Nội dung" error={errors.title}>
        <Input
          id="exp-title"
          maxLength={150}
          placeholder="VD: Lẩu gà lá é"
          value={title}
          aria-invalid={Boolean(errors.title)}
          onChange={(e) => setTitle(e.target.value)}
        />
      </FormField>

      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Loại chi">
        {EXPENSE_CATEGORIES.map((c) => (
          <button
            key={c.value}
            type="button"
            role="radio"
            aria-checked={category === c.value}
            onClick={() => setCategory(c.value)}
            className={cn(
              'flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs sm:text-sm font-semibold transition-all duration-200 active:scale-95 border-2',
              category === c.value
                ? 'bg-gradient-to-r from-rose-500 to-rose-600 text-white border-rose-300 shadow-clay-btn-primary -translate-y-0.5'
                : 'bg-card text-foreground border-white/70 shadow-clay-card hover:-translate-y-0.5 hover:shadow-clay-card-hover',
            )}
          >
            <c.icon className="size-4" />
            {c.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <FormField id="exp-payer" label="Người trả">
          <Select value={paidBy} onValueChange={setPaidBy} disabled={!canChoosePayer}>
              <SelectTrigger id="exp-payer" className="w-full rounded-full shadow-clay-card">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {members.map((m) => (
                  <SelectItem key={m.userId} value={String(m.userId)}>
                    {m.userId === myUserId ? `${m.displayName} (bạn)` : m.displayName}
                  </SelectItem>
                ))}
              </SelectContent>
          </Select>
        </FormField>
        <FormField id="exp-date" label="Ngày chi">
          <Input id="exp-date" type="date" value={spentOn} onChange={(e) => setSpentOn(e.target.value)} />
        </FormField>
      </div>

        <div className="grid gap-2.5">
          <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-foreground">Chia cho</p>
              <label className="flex items-center gap-2 text-xs font-semibold text-foreground cursor-pointer">
                <input
                  type="checkbox"
                  className="size-4 rounded accent-primary cursor-pointer"
                  checked={mode === 'CUSTOM'}
                  onChange={(e) => setMode(e.target.checked ? 'CUSTOM' : 'EQUAL')}
                />
                Chia không đều
              </label>
          </div>

          {mode === 'EQUAL' ? (
            <>
              <div className="flex flex-wrap gap-2">
                {members.map((m) => {
                  const on = participants.includes(m.userId)
                  return (
                    <button
                      key={m.userId}
                      type="button"
                      aria-pressed={on}
                      onClick={() => toggleParticipant(m.userId)}
                      className={cn(
                        'flex items-center gap-1.5 rounded-full py-1 pr-3 pl-1 text-xs font-bold transition-all duration-200 border-2 active:scale-95',
                        on
                          ? 'bg-rose-50 border-rose-400 text-rose-700 shadow-clay-badge -translate-y-0.5'
                          : 'bg-card border-white/70 text-muted-foreground shadow-clay-card opacity-60',
                      )}
                    >
                      <UserAvatar userId={m.userId} name={m.displayName} avatarUrl={m.avatarUrl} size="sm" />
                      {m.displayName}
                    </button>
                  )
                })}
              </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground font-medium pt-1">
                  <span>
                    {participants.length > 0 && total > 0
                      ? `≈ ${formatVnd(Math.floor(total / participants.length))} / người`
                      : 'Chọn người tham gia'}
                  </span>
                  <button
                    type="button"
                    className="text-primary font-bold hover:underline"
                    onClick={() => setSelection({ kind: 'exclude', ids: [] })}
                  >
                    Chọn tất cả
                  </button>
                </div>
              </>
              ) : (
                <div className="grid gap-2 rounded-2xl border border-white/80 bg-muted/30 p-3 shadow-clay-sunken">
                  {members.map((m) => (
                    <div key={m.userId} className="flex items-center gap-2">
                      <UserAvatar userId={m.userId} name={m.displayName} avatarUrl={m.avatarUrl} size="sm" />
                      <span className="min-w-0 flex-1 truncate text-xs font-bold text-foreground">{m.displayName}</span>
                      <Input
                        inputMode="numeric"
                        placeholder="0"
                        className="w-36 text-right font-semibold"
                        aria-label={`Phần của ${m.displayName}`}
                        value={fmt(custom[m.userId] ?? '')}
                        onChange={(e) => setCustom((prev) => ({ ...prev, [m.userId]: digitsOnly(e.target.value) }))}
                      />
                    </div>
                  ))}
                    <p className={cn('text-right text-xs font-bold pt-1', diff === 0 ? 'text-emerald-700' : 'text-amber-700')}>
                      {diff === 0 ? 'Đã khớp tổng ✓' : diff > 0 ? `Còn thiếu ${formatVnd(diff)}` : `Thừa ${formatVnd(-diff)}`}
                    </p>
                </div>
        )}
                {errors.participants && <p className="text-xs font-semibold text-destructive">{errors.participants}</p>}
              </div>

              <FormField id="exp-note" label="Ghi chú" optional>
                <Input id="exp-note" maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
              </FormField>

              <div className="flex items-center gap-3">
                <ImageUploadButton purpose="RECEIPT" label="Ảnh hóa đơn" size="sm" onUploaded={setReceiptUrl} />
                {receiptUrl && (
                  <div className="relative">
                    <img src={receiptUrl} alt="Hóa đơn" className="size-14 rounded-2xl object-cover border-2 border-white shadow-clay-card" />
                    <button
                      type="button"
                      aria-label="Bỏ ảnh hóa đơn"
                      onClick={() => setReceiptUrl('')}
                      className="absolute -top-2 -right-2 rounded-full bg-foreground p-1 text-background shadow-clay-badge hover:scale-110 transition-transform"
                    >
                      <X className="size-3" />
                    </button>
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" disabled={pending} onClick={() => onOpenChange(false)}>
                  Hủy
                </Button>
                <Button type="submit" disabled={pending}>
                  {pending ? 'Đang lưu…' : expense ? 'Lưu' : 'Thêm'}
                </Button>
              </DialogFooter>
            </form>
          )
}
