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
import { PACKING_CATEGORIES } from '@/lib/packing'
import type { PackingCategory, PackingItemRequest, PackingItemResponse } from '@/types/packing'

interface PackingItemDialogProps {
  item: PackingItemResponse | null
  pending: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (body: PackingItemRequest) => Promise<unknown>
}

/** Sửa tên, nhóm, số lượng của một món hành lý. */
export function PackingItemDialog(props: PackingItemDialogProps) {
  return (
    <Dialog open={props.item !== null} onOpenChange={props.onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {props.item && <ItemForm key={props.item.id} {...props} item={props.item} />}
      </DialogContent>
    </Dialog>
  )
}

function ItemForm({ item, pending, onSubmit, onOpenChange }: PackingItemDialogProps & { item: PackingItemResponse }) {
  const [name, setName] = useState(item.itemName)
  const [category, setCategory] = useState<PackingCategory>(item.category)
  const [quantity, setQuantity] = useState(String(item.quantity))
  const [errors, setErrors] = useState<Record<string, string>>({})

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const qty = Number(quantity)
    const clientErrors: Record<string, string> = {}
    if (!name.trim()) clientErrors.itemName = 'Nhập tên món'
    if (!Number.isInteger(qty) || qty < 1 || qty > 99) clientErrors.quantity = 'Số lượng từ 1 đến 99'
    setErrors(clientErrors)
    if (Object.keys(clientErrors).length > 0) return
    try {
      await onSubmit({ itemName: name.trim(), category, quantity: qty })
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
        <DialogDescription>Chỉ mình bạn thấy danh sách hành lý này.</DialogDescription>
      </DialogHeader>
      <FormField id="packing-name" label="Tên món" error={errors.itemName}>
        <Input id="packing-name" autoFocus maxLength={150} value={name} onChange={(e) => setName(e.target.value)} />
      </FormField>
      <div className="grid grid-cols-[1fr_6rem] gap-3">
        <FormField id="packing-category" label="Nhóm">
          <Select value={category} onValueChange={(v) => setCategory(v as PackingCategory)}>
            <SelectTrigger id="packing-category">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PACKING_CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
        <FormField id="packing-qty" label="Số lượng" error={errors.quantity}>
          <Input
            id="packing-qty"
            type="number"
            inputMode="numeric"
            min={1}
            max={99}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />
        </FormField>
      </div>
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
