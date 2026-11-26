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
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getErrorMessage, getFieldErrors } from '@/lib/api'
import { CHECKLIST_CATEGORIES } from '@/lib/tripContent'
import type { ChecklistCategory, ChecklistItemRequest, ChecklistItemResponse } from '@/types/checklist'
import type { TripMemberResponse } from '@/types/trip'

const NOBODY = 'none'

interface ChecklistItemDialogProps {
  item: ChecklistItemResponse | null
  members: TripMemberResponse[]
  pending: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (body: ChecklistItemRequest) => Promise<unknown>
}

export function ChecklistItemDialog(props: ChecklistItemDialogProps) {
  return (
    <Dialog open={props.item !== null} onOpenChange={props.onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {props.item && <ItemForm key={props.item.id} {...props} item={props.item} />}
      </DialogContent>
    </Dialog>
  )
}

function ItemForm({
  item,
  members,
  pending,
  onSubmit,
  onOpenChange,
}: ChecklistItemDialogProps & { item: ChecklistItemResponse }) {
  const [name, setName] = useState(item.itemName)
  const [category, setCategory] = useState<ChecklistCategory>(item.category)
  const [quantity, setQuantity] = useState(String(item.quantity))
  const [assignee, setAssignee] = useState(item.assignee ? String(item.assignee.userId) : NOBODY)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!name.trim()) {
      setErrors({ itemName: 'Nhập tên món' })
      return
    }
    try {
      await onSubmit({
        itemName: name.trim(),
        category,
        quantity: Math.min(99, Math.max(1, Number(quantity) || 1)),
        assigneeId: assignee === NOBODY ? null : Number(assignee),
      })
    } catch (error) {
      const fieldErrors = getFieldErrors(error)
      setErrors(fieldErrors)
      if (Object.keys(fieldErrors).length === 0) toast.error(getErrorMessage(error))
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-4" noValidate>
      <DialogHeader>
        <DialogTitle>Sửa món</DialogTitle>
        <DialogDescription>Đổi người mang thì người mới cần tick lại khi đã chuẩn bị xong.</DialogDescription>
      </DialogHeader>
      <FormField id="cl-name" label="Tên món" error={errors.itemName}>
        <Input id="cl-name" maxLength={150} value={name} onChange={(e) => setName(e.target.value)} />
      </FormField>
      <div className="grid grid-cols-[1fr_6rem] gap-3">
        <FormField id="cl-category" label="Nhóm">
          <Select value={category} onValueChange={(v) => setCategory(v as ChecklistCategory)}>
            <SelectTrigger id="cl-category" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CHECKLIST_CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
        <FormField id="cl-qty" label="Số lượng" error={errors.quantity}>
          <Input
            id="cl-qty"
            type="number"
            min={1}
            max={99}
            inputMode="numeric"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />
        </FormField>
      </div>
      <FormField id="cl-assignee" label="Người mang">
        <Select value={assignee} onValueChange={setAssignee}>
          <SelectTrigger id="cl-assignee" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NOBODY}>Chưa ai nhận</SelectItem>
            {members.map((m) => (
              <SelectItem key={m.userId} value={String(m.userId)}>
                {m.displayName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>
      <DialogFooter>
        <Button type="button" variant="outline" disabled={pending} onClick={() => onOpenChange(false)}>
          Hủy
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? 'Đang lưu…' : 'Lưu'}
        </Button>
      </DialogFooter>
    </form>
  )
}
