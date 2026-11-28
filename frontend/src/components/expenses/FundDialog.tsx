import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { FormField } from '@/components/FormField'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { getErrorMessage, getFieldErrors } from '@/lib/api'
import type { FundRequest, FundResponse } from '@/types/expense'
import type { TripMemberResponse } from '@/types/trip'
import { MoneyInput } from './ExpenseFormDialog'

interface FundDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** null = bật quỹ mới */
  fund: FundResponse | null
  members: TripMemberResponse[]
  myUserId: number
  pending: boolean
  onSubmit: (body: FundRequest) => Promise<unknown>
  onDisable: () => void
}

/** OWNER bật / sửa quỹ chung (docs/sdd-trip-fund.md 4.1). */
export function FundDialog(props: FundDialogProps) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="max-h-[92svh] overflow-y-auto sm:max-w-md">
        {props.open && <FundForm {...props} />}
      </DialogContent>
    </Dialog>
  )
}

function FundForm({ fund, members, myUserId, pending, onSubmit, onDisable, onOpenChange }: FundDialogProps) {
  const [treasurer, setTreasurer] = useState(String(fund?.treasurerId ?? myUserId))
  const [target, setTarget] = useState(fund ? String(fund.perPersonTarget) : '')
  const [note, setNote] = useState(fund?.note ?? '')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const locked = fund?.inUse ?? false

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const amount = Number(target || 0)
    if (amount < 1000) {
      setErrors({ perPersonTarget: 'Mức nộp tối thiểu 1.000 ₫' })
      return
    }
    setErrors({})
    try {
      await onSubmit({ treasurerId: Number(treasurer), perPersonTarget: amount, note: note.trim() || null })
    } catch (error) {
      const fieldErrors = getFieldErrors(error)
      setErrors(fieldErrors)
      if (Object.keys(fieldErrors).length === 0) toast.error(getErrorMessage(error))
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-5" noValidate>
      <DialogHeader>
        <DialogTitle>{fund ? 'Sửa quỹ chung' : 'Bật quỹ chung'}</DialogTitle>
        <DialogDescription>
          Mỗi người nộp trước cho thủ quỹ, các khoản chung chi từ quỹ. Cuối chuyến app tự tính tiền thừa trả lại ai.
        </DialogDescription>
      </DialogHeader>

      <FormField
        id="fund-target"
        label="Mỗi người nộp (₫)"
        error={errors.perPersonTarget}
        hint={fund ? 'Thu thêm đợt sau thì nâng mức này lên, ai thiếu sẽ thấy phần còn thiếu.' : undefined}
      >
        <MoneyInput
          id="fund-target"
          autoFocus
          placeholder="VD: 2.000.000"
          className="text-xl font-bold tabular-nums"
          value={target}
          aria-invalid={Boolean(errors.perPersonTarget)}
          onValueChange={setTarget}
        />
      </FormField>

      <FormField
        id="fund-treasurer"
        label="Thủ quỹ"
        error={errors.treasurerId}
        hint={locked ? 'Quỹ đã có người nộp hoặc đã chi nên không đổi thủ quỹ được nữa.' : 'Người giữ tiền quỹ.'}
      >
        <Select value={treasurer} onValueChange={setTreasurer} disabled={locked}>
          <SelectTrigger id="fund-treasurer" className="w-full">
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

      <FormField id="fund-note" label="Ghi chú" optional error={errors.note}>
        <Textarea
          id="fund-note"
          rows={2}
          maxLength={300}
          placeholder="VD: nộp trước 1/12, chuyển khoản hoặc đưa tiền mặt cho Mai"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </FormField>

      <DialogFooter className="gap-2 sm:justify-between">
        {fund && !locked ? (
          <Button type="button" variant="ghost" className="text-destructive" disabled={pending} onClick={onDisable}>
            Tắt quỹ
          </Button>
        ) : (
          <span className="hidden sm:block" />
        )}
        <div className="flex flex-col-reverse gap-2 sm:flex-row">
          <Button type="button" variant="outline" disabled={pending} onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? 'Đang lưu…' : fund ? 'Lưu' : 'Bật quỹ'}
          </Button>
        </div>
      </DialogFooter>
    </form>
  )
}
