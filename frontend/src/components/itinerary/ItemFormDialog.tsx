import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { ChoiceChips } from '@/components/common/ChoiceChips'
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
import { Textarea } from '@/components/ui/textarea'
import { getErrorMessage, getFieldErrors } from '@/lib/api'
import { roundDown5 } from '@/lib/sunTimes'
import { ITINERARY_CATEGORIES } from '@/lib/tripContent'
import type { ItineraryCategory, ItineraryItemRequest, ItineraryItemResponse } from '@/types/itinerary'
import type { SunResponse } from '@/types/weather'

interface ItemFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Có item → chế độ sửa */
  item?: ItineraryItemResponse
  dayLabel: string
  /** Giờ vàng của ngày: gợi ý giờ bắt đầu cho hoạt động chụp ảnh */
  sun?: SunResponse | null
  pending: boolean
  onSubmit: (body: ItineraryItemRequest) => Promise<unknown>
}

export function ItemFormDialog(props: ItemFormDialogProps) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="max-h-[92svh] overflow-y-auto sm:max-w-lg">
        {props.open && <ItemForm key={props.item?.id ?? 'new'} {...props} />}
      </DialogContent>
    </Dialog>
  )
}

interface FormState {
  title: string
  category: ItineraryCategory
  startTime: string
  endTime: string
  locationName: string
  mapsUrl: string
  note: string
  cost: string
}

const orNull = (value: string) => (value.trim() ? value.trim() : null)
const digitsOnly = (value: string) => value.replace(/\D/g, '')

function ItemForm({ item, dayLabel, sun, pending, onSubmit, onOpenChange }: ItemFormDialogProps) {
  const [form, setForm] = useState<FormState>(() => ({
    title: item?.title ?? '',
    category: item?.category ?? 'SIGHTSEEING',
    startTime: item?.startTime ?? '',
    endTime: item?.endTime ?? '',
    locationName: item?.locationName ?? '',
    mapsUrl: item?.mapsUrl ?? '',
    note: item?.note ?? '',
    cost: item?.estimatedCost != null ? String(item.estimatedCost) : '',
  }))
  const [errors, setErrors] = useState<Record<string, string>>({})

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((prev) => ({ ...prev, [key]: value }))

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const clientErrors: Record<string, string> = {}
    if (!form.title.trim()) clientErrors.title = 'Nhập tên hoạt động'
    if (form.endTime && !form.startTime) clientErrors.startTime = 'Có giờ kết thúc thì cần giờ bắt đầu'
    setErrors(clientErrors)
    if (Object.keys(clientErrors).length > 0) return

    try {
      await onSubmit({
        title: form.title.trim(),
        category: form.category,
        startTime: orNull(form.startTime),
        endTime: orNull(form.endTime),
        locationName: orNull(form.locationName),
        mapsUrl: orNull(form.mapsUrl),
        note: orNull(form.note),
        estimatedCost: form.cost ? Number(form.cost) : null,
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
        <DialogTitle>{item ? 'Sửa hoạt động' : 'Thêm hoạt động'}</DialogTitle>
        <DialogDescription>
          {dayLabel}. Có giờ thì tự xếp đúng vị trí, không có giờ thì đặt cuối ngày.
        </DialogDescription>
      </DialogHeader>

      <ChoiceChips
        label="Loại hoạt động"
        options={ITINERARY_CATEGORIES}
        value={form.category}
        onChange={(value) => set('category', value)}
      />

      <FormField id="item-title" label="Tên hoạt động" error={errors.title}>
        <Input
          id="item-title"
          autoFocus
          maxLength={150}
          placeholder="VD: Săn mây đồi Đa Phú"
          value={form.title}
          aria-invalid={Boolean(errors.title)}
          onChange={(e) => set('title', e.target.value)}
        />
      </FormField>

      <div className="grid grid-cols-2 gap-3">
        <FormField id="item-start" label="Bắt đầu" optional error={errors.startTime}>
          <Input
            id="item-start"
            type="time"
            value={form.startTime}
            onChange={(e) => set('startTime', e.target.value)}
          />
        </FormField>
        <FormField id="item-end" label="Kết thúc" optional error={errors.endTime}>
          <Input id="item-end" type="time" value={form.endTime} onChange={(e) => set('endTime', e.target.value)} />
        </FormField>
      </div>
      {sun && (
        <div className="-mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span>Giờ vàng để chụp ảnh:</span>
          <Button
            type="button"
            variant="outline"
            size="xs"
            onClick={() => set('startTime', roundDown5(sun.morningGoldenStart))}
          >
            Sáng {sun.morningGoldenStart}–{sun.morningGoldenEnd}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="xs"
            onClick={() => set('startTime', roundDown5(sun.eveningGoldenStart))}
          >
            Chiều {sun.eveningGoldenStart}–{sun.eveningGoldenEnd}
          </Button>
        </div>
      )}

      <FormField id="item-location" label="Địa điểm" optional error={errors.locationName}>
        <Input
          id="item-location"
          maxLength={200}
          placeholder="VD: Chợ Đà Lạt"
          value={form.locationName}
          onChange={(e) => set('locationName', e.target.value)}
        />
      </FormField>

      <FormField
        id="item-maps"
        label="Link Google Maps"
        optional
        error={errors.mapsUrl}
        hint="Bỏ trống thì bấm vào địa điểm sẽ tự tìm trên Google Maps."
      >
        <Input
          id="item-maps"
          inputMode="url"
          placeholder="https://maps.app.goo.gl/…"
          value={form.mapsUrl}
          aria-invalid={Boolean(errors.mapsUrl)}
          onChange={(e) => set('mapsUrl', e.target.value)}
        />
      </FormField>

      <FormField id="item-cost" label="Chi phí dự kiến / người (₫)" optional error={errors.estimatedCost}>
        <Input
          id="item-cost"
          inputMode="numeric"
          placeholder="VD: 150.000"
          value={form.cost ? Number(form.cost).toLocaleString('vi-VN') : ''}
          onChange={(e) => set('cost', digitsOnly(e.target.value).slice(0, 10))}
        />
      </FormField>

      <FormField id="item-note" label="Ghi chú chuẩn bị" optional error={errors.note}>
        <Textarea
          id="item-note"
          rows={2}
          maxLength={1000}
          placeholder="VD: Mặc áo ấm, mang tiền mặt"
          value={form.note}
          onChange={(e) => set('note', e.target.value)}
        />
      </FormField>

      <DialogFooter>
        <Button type="button" variant="outline" disabled={pending} onClick={() => onOpenChange(false)}>
          Hủy
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? 'Đang lưu…' : item ? 'Lưu' : 'Thêm'}
        </Button>
      </DialogFooter>
    </form>
  )
}
