import { useState, type FormEvent } from 'react'
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
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { getErrorMessage, getFieldErrors } from '@/lib/api'
import { COVER_PRESETS, presetValue } from '@/lib/covers'
import type { TripDetailResponse, TripRequest } from '@/types/trip'
import { FieldError } from './common/layout'
import { CoverPicker } from './CoverPicker'
import { FormField } from './FormField'
import { PlacePicker, type PlaceLocation } from './PlacePicker'

interface TripFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Có trip → chế độ sửa */
  trip?: TripDetailResponse
  pending: boolean
  onSubmit: (body: TripRequest) => Promise<unknown>
}

interface FormState {
  title: string
  destination: string
  /** Tọa độ khi chọn từ gợi ý; gõ tay → null */
  location: PlaceLocation | null
  description: string
  coverImageUrl: string
  plannedStartDate: string
  plannedEndDate: string
}

function initialState(trip?: TripDetailResponse): FormState {
  return {
    title: trip?.title ?? '',
    destination: trip?.destination ?? '',
    location:
      trip?.destinationLat != null && trip.destinationLon != null
        ? { lat: trip.destinationLat, lon: trip.destinationLon }
        : null,
    description: trip?.description ?? '',
    coverImageUrl:
      trip?.coverImageUrl ?? presetValue(COVER_PRESETS[Math.floor(Math.random() * COVER_PRESETS.length)].key),
    plannedStartDate: trip?.plannedStartDate ?? '',
    plannedEndDate: trip?.plannedEndDate ?? '',
  }
}

const orNull = (value: string) => (value.trim() ? value.trim() : null)

function validate(form: FormState): Record<string, string> {
  const errors: Record<string, string> = {}
  if (!form.title.trim()) errors.title = 'Tên chuyến đi không được để trống'
  const hasStart = Boolean(form.plannedStartDate)
  const hasEnd = Boolean(form.plannedEndDate)
  if (hasStart !== hasEnd) {
    errors.plannedEndDate = 'Cần nhập cả ngày bắt đầu và ngày kết thúc'
  } else if (hasStart && form.plannedEndDate < form.plannedStartDate) {
    errors.plannedEndDate = 'Ngày kết thúc phải sau hoặc bằng ngày bắt đầu'
  }
  return errors
}

export function TripFormDialog(props: TripFormDialogProps) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        {/* key: mở lại dialog thì form được dựng lại với dữ liệu mới nhất */}
        {props.open && <TripForm key={props.trip?.id ?? 'new'} {...props} />}
      </DialogContent>
    </Dialog>
  )
}

function TripForm({ trip, pending, onSubmit, onOpenChange }: TripFormDialogProps) {
  const [form, setForm] = useState<FormState>(() => initialState(trip))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const isEdit = Boolean(trip)

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => {
      if (!(key in prev)) return prev
      const next = { ...prev }
      delete next[key]
      return next
    })
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const clientErrors = validate(form)
    setErrors(clientErrors)
    setFormError(null)
    if (Object.keys(clientErrors).length > 0) return

    try {
      await onSubmit({
        title: form.title.trim(),
        destination: orNull(form.destination),
        // Không còn chữ điểm đến thì cũng bỏ vị trí
        destinationLat: orNull(form.destination) && form.location ? form.location.lat : null,
        destinationLon: orNull(form.destination) && form.location ? form.location.lon : null,
        description: orNull(form.description),
        coverImageUrl: orNull(form.coverImageUrl),
        plannedStartDate: orNull(form.plannedStartDate),
        plannedEndDate: orNull(form.plannedEndDate),
      })
    } catch (error) {
      const fieldErrors = getFieldErrors(error)
      setErrors(fieldErrors)
      if (Object.keys(fieldErrors).length === 0) setFormError(getErrorMessage(error))
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-5" noValidate>
      <DialogHeader>
        <DialogTitle>{isEdit ? 'Sửa chuyến đi' : 'Tạo chuyến đi mới'}</DialogTitle>
        <DialogDescription>
          {isEdit ? 'Cập nhật thông tin cho cả nhóm.' : 'Đặt tên, chọn ảnh bìa rồi gửi link mời cho cả nhóm.'}
        </DialogDescription>
      </DialogHeader>

      <FormField id="title" label="Tên chuyến đi" error={errors.title}>
        <Input
          id="title"
          autoFocus
          maxLength={150}
          placeholder="VD: Đà Lạt săn mây 2027"
          value={form.title}
          aria-invalid={Boolean(errors.title)}
          onChange={(e) => set('title', e.target.value)}
        />
      </FormField>

      <FormField id="destination" label="Điểm đến" optional error={errors.destination}>
        <PlacePicker
          id="destination"
          maxLength={150}
          placeholder="VD: Đà Lạt"
          value={form.destination}
          location={form.location}
          onChange={(destination, location) => {
            set('destination', destination)
            set('location', location)
          }}
        />
      </FormField>

      <fieldset className="grid gap-2">
        <legend className="mb-2 text-sm font-medium">
          Khoảng ngày dự kiến <span className="font-normal text-muted-foreground">(không bắt buộc)</span>
        </legend>
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="plannedStartDate" className="text-xs font-normal text-muted-foreground">
              Bắt đầu
            </Label>
            <Input
              id="plannedStartDate"
              type="date"
              aria-describedby="plannedDates-message"
              value={form.plannedStartDate}
              onChange={(e) => set('plannedStartDate', e.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="plannedEndDate" className="text-xs font-normal text-muted-foreground">
              Kết thúc
            </Label>
            <Input
              id="plannedEndDate"
              type="date"
              min={form.plannedStartDate || undefined}
              value={form.plannedEndDate}
              aria-invalid={Boolean(errors.plannedEndDate)}
              aria-describedby="plannedDates-message"
              onChange={(e) => set('plannedEndDate', e.target.value)}
            />
          </div>
        </div>
        {errors.plannedEndDate ? (
          <p id="plannedDates-message" role="alert" className="text-sm text-destructive">
            {errors.plannedEndDate}
          </p>
        ) : (
          <p id="plannedDates-message" className="text-sm text-muted-foreground">
            Ngày chính thức sẽ chốt sau khi cả nhóm khai lịch rảnh.
          </p>
        )}
      </fieldset>

      <FormField id="description" label="Mô tả" optional error={errors.description}>
        <Textarea
          id="description"
          rows={3}
          maxLength={2000}
          placeholder="Săn mây, cafe view đồi, chụp ảnh áo dài…"
          value={form.description}
          onChange={(e) => set('description', e.target.value)}
        />
      </FormField>

      <fieldset className="grid gap-2">
        <legend className="mb-2 text-sm font-medium">Ảnh bìa</legend>
        <CoverPicker
          value={form.coverImageUrl}
          onChange={(v) => set('coverImageUrl', v)}
          error={errors.coverImageUrl}
        />
      </fieldset>

      {formError && <FieldError>{formError}</FieldError>}

      <DialogFooter sticky>
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
          Hủy
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? 'Đang lưu…' : isEdit ? 'Lưu thay đổi' : 'Tạo chuyến đi'}
        </Button>
      </DialogFooter>
    </form>
  )
}
