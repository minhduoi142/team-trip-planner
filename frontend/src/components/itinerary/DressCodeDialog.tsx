import { Check } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { FormField } from '@/components/FormField'
import { ImageUploadButton } from '@/components/ImageUploadButton'
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
import { DRESS_COLORS, MAX_DRESS_COLORS } from '@/lib/dressColors'
import { cn } from '@/lib/utils'
import type { ItineraryDayResponse, UpdateDayRequest } from '@/types/itinerary'

interface DressCodeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  day: ItineraryDayResponse
  dayLabel: string
  pending: boolean
  onSubmit: (body: UpdateDayRequest) => Promise<unknown>
}

export function DressCodeDialog(props: DressCodeDialogProps) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="max-h-[92svh] overflow-y-auto sm:max-w-lg">
        {props.open && <DressCodeForm key={props.day.id} {...props} />}
      </DialogContent>
    </Dialog>
  )
}

const orNull = (value: string) => (value.trim() ? value.trim() : null)

function DressCodeForm({ day, dayLabel, pending, onSubmit, onOpenChange }: DressCodeDialogProps) {
  const [note, setNote] = useState(day.note ?? '')
  const [theme, setTheme] = useState(day.dress.theme ?? '')
  const [dressNote, setDressNote] = useState(day.dress.note ?? '')
  const [imageUrl, setImageUrl] = useState(day.dress.imageUrl ?? '')
  const [colors, setColors] = useState<string[]>(day.dress.colors)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const toggleColor = (key: string) =>
    setColors((prev) => {
      if (prev.includes(key)) return prev.filter((c) => c !== key)
      if (prev.length >= MAX_DRESS_COLORS) {
        toast.info(`Chọn tối đa ${MAX_DRESS_COLORS} màu thôi nha`)
        return prev
      }
      return [...prev, key]
    })

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    try {
      await onSubmit({
        note: orNull(note),
        dressTheme: orNull(theme),
        dressNote: orNull(dressNote),
        dressImageUrl: orNull(imageUrl),
        dressColors: colors,
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
        <DialogTitle>Dress code & ghi chú ✨</DialogTitle>
        <DialogDescription>{dayLabel}. Cả nhóm mặc ton-sur-ton chụp ảnh cho xịn!</DialogDescription>
      </DialogHeader>

      <FormField id="dress-theme" label="Chủ đề" optional error={errors.dressTheme}>
        <Input
          id="dress-theme"
          maxLength={100}
          placeholder="VD: Trắng tinh khôi, Vintage, Áo dài…"
          value={theme}
          onChange={(e) => setTheme(e.target.value)}
        />
      </FormField>

      <div className="grid gap-2">
        <p className="text-sm font-medium">
          Tông màu{' '}
          <span className="font-normal text-muted-foreground">
            ({colors.length}/{MAX_DRESS_COLORS})
          </span>
        </p>
        <div className="grid grid-cols-8 gap-2">
          {DRESS_COLORS.map((c) => {
            const selected = colors.includes(c.key)
            return (
              <button
                key={c.key}
                type="button"
                aria-pressed={selected}
                aria-label={c.label}
                title={c.label}
                onClick={() => toggleColor(c.key)}
                className={cn(
                  'relative aspect-square rounded-full ring-1 ring-border ring-offset-2 transition',
                  selected && 'ring-2 ring-primary',
                )}
                style={{ backgroundColor: c.hex }}
              >
                {selected && (
                  <Check className="absolute inset-0 m-auto size-4 text-white mix-blend-difference" strokeWidth={3} />
                )}
              </button>
            )
          })}
        </div>
        {errors.dressColors && <p className="text-sm text-destructive">{errors.dressColors}</p>}
      </div>

      <FormField id="dress-image" label="Ảnh mẫu" optional error={errors.dressImageUrl}>
        <div className="flex gap-2">
          <Input
            id="dress-image"
            inputMode="url"
            placeholder="Dán link (Pinterest…) hoặc tải ảnh"
            className="min-w-0 flex-1"
            value={imageUrl}
            aria-invalid={Boolean(errors.dressImageUrl)}
            onChange={(e) => setImageUrl(e.target.value)}
          />
          <ImageUploadButton purpose="DRESS_CODE" label="Tải ảnh" className="shrink-0" onUploaded={setImageUrl} />
        </div>
        {imageUrl && (
          <img
            src={imageUrl}
            alt="Xem trước ảnh mẫu"
            className="mt-1 h-28 w-28 rounded-2xl object-cover ring-1 ring-border"
            referrerPolicy="no-referrer"
          />
        )}
      </FormField>

      <FormField id="dress-note" label="Ghi chú trang phục" optional error={errors.dressNote}>
        <Textarea
          id="dress-note"
          rows={2}
          maxLength={500}
          placeholder="VD: Váy trắng + mũ cói, giày bệt để leo dốc"
          value={dressNote}
          onChange={(e) => setDressNote(e.target.value)}
        />
      </FormField>

      <FormField id="day-note" label="Ghi chú chung cho ngày" optional error={errors.note}>
        <Input
          id="day-note"
          maxLength={500}
          placeholder="VD: Tập trung sảnh 6:30"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
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
