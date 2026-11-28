import dayjs from 'dayjs'
import { Check, PiggyBank } from 'lucide-react'
import { useLayoutEffect, useRef, useState, type ComponentProps, type FormEvent } from 'react'
import { toast } from 'sonner'
import { FormField } from '@/components/FormField'
import { ImageUploadButton } from '@/components/ImageUploadButton'
import { UserAvatar } from '@/components/UserAvatar'
import { ChoiceChips } from '@/components/common/ChoiceChips'
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
import { Switch } from '@/components/ui/switch'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { getErrorMessage, getFieldErrors } from '@/lib/api'
import { EXPENSE_CATEGORIES, formatVnd } from '@/lib/tripContent'
import { cn } from '@/lib/utils'
import type { ExpenseCategory, ExpenseRequest, ExpenseResponse, FundResponse, SplitMode } from '@/types/expense'
import type { TripMemberResponse } from '@/types/trip'

interface ExpenseFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  expense?: ExpenseResponse
  members: TripMemberResponse[]
  myUserId: number
  /** Chỉ Trưởng nhóm được chọn người trả khác mình (ghi hộ) */
  canChoosePayer: boolean
  /** Quỹ chung đang bật (docs/sdd-trip-fund.md): thủ quỹ / OWNER thấy công tắc "Chi từ quỹ chung" */
  fund?: FundResponse | null
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

const SPLIT_MODES: { value: SplitMode; label: string }[] = [
  { value: 'EQUAL', label: 'Chia đều' },
  { value: 'CUSTOM', label: 'Tự nhập' },
]

/**
 * Ô nhập tiền VND: hiển thị "1.200.000" nhưng giữ đúng vị trí con trỏ khi format lại (P3-CP-19).
 * `value` là chuỗi chữ số thô.
 */
export function MoneyInput({
  value,
  onValueChange,
  ...props
}: Omit<ComponentProps<typeof Input>, 'value' | 'onChange'> & {
  value: string
  onValueChange: (digits: string) => void
}) {
  const ref = useRef<HTMLInputElement>(null)
  // Số chữ số bên trái con trỏ sau lần gõ gần nhất; null = không cần đặt lại con trỏ
  const caretDigits = useRef<number | null>(null)
  const display = fmt(value)

  useLayoutEffect(() => {
    const input = ref.current
    const digitsLeft = caretDigits.current
    caretDigits.current = null
    if (!input || digitsLeft === null || document.activeElement !== input) return
    let pos = 0
    let seen = 0
    while (pos < display.length && seen < digitsLeft) {
      if (/\d/.test(display[pos])) seen++
      pos++
    }
    input.setSelectionRange(pos, pos)
  })

  return (
    <Input
      {...props}
      ref={ref}
      inputMode="numeric"
      autoComplete="off"
      value={display}
      onChange={(e) => {
        const raw = e.target.value
        const caret = e.target.selectionStart ?? raw.length
        caretDigits.current = digitsOnly(raw.slice(0, caret)).length
        onValueChange(digitsOnly(raw))
      }}
    />
  )
}

function ExpenseForm({
  expense,
  members,
  myUserId,
  canChoosePayer,
  fund,
  pending,
  onSubmit,
  onOpenChange,
}: ExpenseFormDialogProps) {
  const canUseFund = Boolean(fund?.canSpend)
  const [fromFund, setFromFund] = useState(expense?.fromFund ?? false)
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
  /** Số dư quỹ có thể dùng cho khoản này (sửa khoản đã chi từ quỹ thì cộng lại chính nó) */
  const fundAvailable = fund ? fund.balance + (expense?.fromFund ? expense.amount : 0) : 0
  const effectivePayer = fromFund && fund ? String(fund.treasurerId) : paidBy
  const customSum = Object.values(custom).reduce((sum, v) => sum + Number(v || 0), 0)
  const diff = total - customSum

  const setParticipants = (values: string[]) => {
    const on = new Set(values.map(Number))
    setSelection((prev) =>
      prev.kind === 'include'
        ? { kind: 'include', ids: [...on] }
        : { kind: 'exclude', ids: members.map((m) => m.userId).filter((id) => !on.has(id)) },
    )
  }

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
        paidBy: Number(effectivePayer),
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
        fromFund: fromFund && Boolean(fund),
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
        <MoneyInput
          id="exp-amount"
          autoFocus
          placeholder="VD: 1.200.000"
          className="text-xl font-bold tracking-tight text-foreground tabular-nums"
          value={amount}
          aria-invalid={Boolean(errors.amount)}
          onValueChange={setAmount}
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

      <div className="grid gap-2">
        <p className="text-sm font-medium text-foreground">Loại chi</p>
        <ChoiceChips label="Loại chi" options={EXPENSE_CATEGORIES} value={category} onChange={setCategory} />
      </div>

      {fund && (canUseFund || expense?.fromFund) && (
        <div className="grid gap-1.5 rounded-item border border-border bg-muted/40 p-3">
          <label htmlFor="exp-from-fund" className="flex cursor-pointer items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <PiggyBank className="size-4 text-primary-strong" aria-hidden="true" />
              Chi từ quỹ chung
            </span>
            <Switch id="exp-from-fund" checked={fromFund} disabled={!canUseFund} onCheckedChange={setFromFund} />
          </label>
          {fromFund && (
            <p className="text-xs text-muted-foreground">
              Quỹ còn <b className="text-foreground tabular-nums">{formatVnd(fundAvailable)}</b>. Người trả là thủ quỹ.
              {total > fundAvailable && (
                <span className="font-medium text-warning-soft-foreground">
                  {' '}
                  Khoản này vượt số dư, thủ quỹ sẽ ứng trước {formatVnd(total - Math.max(0, fundAvailable))}.
                </span>
              )}
            </p>
          )}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <FormField
          id="exp-payer"
          label="Người trả"
          hint={
            fromFund ? 'Chi từ quỹ: thủ quỹ trả' : canChoosePayer ? undefined : 'Chỉ trưởng nhóm ghi hộ được người khác'
          }
        >
          <Select value={effectivePayer} onValueChange={setPaidBy} disabled={!canChoosePayer || fromFund}>
            <SelectTrigger id="exp-payer" className="w-full">
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
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium text-foreground">Chia cho</p>
          <ChoiceChips label="Cách chia" size="sm" options={SPLIT_MODES} value={mode} onChange={setMode} />
        </div>

        {mode === 'EQUAL' ? (
          <>
            <ToggleGroup
              type="multiple"
              aria-label="Người cùng chia"
              value={participants.map(String)}
              onValueChange={setParticipants}
            >
              {members.map((m) => {
                const on = participants.includes(m.userId)
                return (
                  <ToggleGroupItem key={m.userId} value={String(m.userId)} className="min-h-11 pl-1.5">
                    <UserAvatar userId={m.userId} name={m.displayName} avatarUrl={m.avatarUrl} size="sm" />
                    <span className="max-w-32 truncate">{m.displayName}</span>
                    {on && <Check aria-hidden="true" />}
                  </ToggleGroupItem>
                )
              })}
            </ToggleGroup>
            <div className="flex items-center justify-between gap-2 pt-1 text-sm text-muted-foreground">
              <span className="tabular-nums">
                {participants.length > 0 && total > 0
                  ? `≈ ${formatVnd(Math.floor(total / participants.length))} / người`
                  : 'Chọn người tham gia'}
              </span>
              <Button type="button" variant="link" size="sm" onClick={() => setSelection({ kind: 'exclude', ids: [] })}>
                Chọn tất cả
              </Button>
            </div>
          </>
        ) : (
          <div className="grid gap-2 rounded-item border border-border bg-muted/40 p-3">
            {members.map((m) => (
              <div key={m.userId} className="flex items-center gap-2">
                <UserAvatar userId={m.userId} name={m.displayName} avatarUrl={m.avatarUrl} size="sm" />
                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">{m.displayName}</span>
                <MoneyInput
                  placeholder="0"
                  className="w-36 text-right font-semibold tabular-nums"
                  aria-label={`Phần của ${m.displayName}`}
                  value={custom[m.userId] ?? ''}
                  onValueChange={(digits) => setCustom((prev) => ({ ...prev, [m.userId]: digits }))}
                />
              </div>
            ))}
            <p
              aria-live="polite"
              className={cn(
                'flex items-center justify-end gap-1 pt-1 text-right text-sm font-semibold tabular-nums',
                diff === 0 ? 'text-success-soft-foreground' : 'text-warning-soft-foreground',
              )}
            >
              {diff === 0 && <Check className="size-4" aria-hidden="true" />}
              {diff === 0 ? 'Đã khớp tổng' : diff > 0 ? `Còn thiếu ${formatVnd(diff)}` : `Thừa ${formatVnd(-diff)}`}
            </p>
          </div>
        )}
        {errors.participants && (
          <p role="alert" className="text-sm text-destructive">
            {errors.participants}
          </p>
        )}
      </div>

      <FormField id="exp-note" label="Ghi chú" optional>
        <Input id="exp-note" maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
      </FormField>

      <div className="flex flex-wrap items-center gap-3">
        <ImageUploadButton purpose="RECEIPT" label="Ảnh hóa đơn" size="sm" onUploaded={setReceiptUrl} />
        {receiptUrl && (
          <>
            <img src={receiptUrl} alt="Hóa đơn" className="size-14 rounded-control border border-border object-cover" />
            <Button type="button" variant="ghost" size="sm" onClick={() => setReceiptUrl('')}>
              Bỏ ảnh
            </Button>
          </>
        )}
      </div>

      <DialogFooter sticky>
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
