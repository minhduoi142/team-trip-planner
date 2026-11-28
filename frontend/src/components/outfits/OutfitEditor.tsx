import { Check, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
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
import { Textarea } from '@/components/ui/textarea'
import { DRESS_COLORS, isLightColor } from '@/lib/dressColors'
import { MAX_OUTFIT_COLORS, MAX_OUTFIT_PHOTOS } from '@/lib/outfits'
import { cn } from '@/lib/utils'
import type { OutfitRequest, OutfitResponse } from '@/types/outfit'

interface OutfitEditorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  dayLabel: string
  /** Màu dress code của ngày: đứng đầu và có viền gợi ý */
  dressColors: string[]
  /** Outfit hiện có của mình; null = tạo mới (mỗi ngày bắt đầu trống) */
  current: OutfitResponse | null
  pending: boolean
  onSubmit: (body: OutfitRequest) => void
  onRemove: () => void
}

export function OutfitEditor(props: OutfitEditorProps) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="max-h-[92svh] overflow-y-auto sm:max-w-lg">
        {props.open && <EditorForm key={props.current?.updatedAt ?? 'new'} {...props} />}
      </DialogContent>
    </Dialog>
  )
}

function EditorForm({ dayLabel, dressColors, current, pending, onSubmit, onRemove, onOpenChange }: OutfitEditorProps) {
  const [photos, setPhotos] = useState<string[]>(current?.photoUrls ?? [])
  const [colors, setColors] = useState<string[]>(current?.colors ?? [])
  const [note, setNote] = useState(current?.note ?? '')
  const [error, setError] = useState<string | null>(null)

  const palette = [
    ...DRESS_COLORS.filter((c) => dressColors.includes(c.key)),
    ...DRESS_COLORS.filter((c) => !dressColors.includes(c.key)),
  ]

  const move = (index: number, delta: number) =>
    setPhotos((prev) => {
      const next = [...prev]
      const [item] = next.splice(index, 1)
      next.splice(index + delta, 0, item)
      return next
    })

  const toggleColor = (key: string) =>
    setColors((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]))

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (photos.length === 0 && colors.length === 0 && !note.trim()) {
      setError('Thêm ít nhất 1 ảnh, 1 màu hoặc ghi chú')
      return
    }
    setError(null)
    onSubmit({ photoUrls: photos, colors, note: note.trim() || null })
  }

  return (
    <form onSubmit={submit} className="grid gap-5" noValidate>
      <DialogHeader>
        <DialogTitle>{current ? 'Sửa outfit của bạn' : 'Outfit của bạn'}</DialogTitle>
        <DialogDescription>{dayLabel}. Cả nhóm sẽ thấy để phối đồ cho hợp.</DialogDescription>
      </DialogHeader>

      <div className="grid gap-2">
        <p className="text-sm font-medium">
          Ảnh <span className="font-normal text-muted-foreground">(tối đa {MAX_OUTFIT_PHOTOS})</span>
        </p>
        {photos.length > 0 && (
          <ul className="grid grid-cols-4 gap-2">
            {photos.map((url, i) => (
              <li key={`${url}-${i}`} className="grid gap-1">
                <img
                  src={url}
                  alt={`Ảnh ${i + 1}`}
                  className="aspect-3/4 w-full rounded-item border border-border object-cover"
                />
                <div className="flex justify-center gap-0.5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    aria-label={`Đưa ảnh ${i + 1} lên trước`}
                    disabled={i === 0}
                    onClick={() => move(i, -1)}
                  >
                    <ChevronLeft />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    aria-label={`Bỏ ảnh ${i + 1}`}
                    onClick={() => setPhotos((prev) => prev.filter((_, j) => j !== i))}
                  >
                    <X />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    aria-label={`Đưa ảnh ${i + 1} ra sau`}
                    disabled={i === photos.length - 1}
                    onClick={() => move(i, 1)}
                  >
                    <ChevronRight />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
        {photos.length < MAX_OUTFIT_PHOTOS && (
          <ImageUploadButton
            purpose="OUTFIT"
            label={photos.length === 0 ? 'Tải ảnh outfit' : 'Thêm ảnh'}
            className="justify-self-start"
            onUploaded={(url) => setPhotos((prev) => (prev.length < MAX_OUTFIT_PHOTOS ? [...prev, url] : prev))}
          />
        )}
      </div>

      <fieldset className="grid gap-2">
        <legend className="mb-2 text-sm font-medium">
          Tông màu <span className="font-normal text-muted-foreground">(tối đa {MAX_OUTFIT_COLORS})</span>
        </legend>
        {dressColors.length > 0 && (
          <p className="-mt-1 text-xs text-muted-foreground">Màu viền nét đứt là màu dress code của ngày.</p>
        )}
        <ul className="flex flex-wrap gap-1.5">
          {palette.map((c) => {
            const selected = colors.includes(c.key)
            const disabled = !selected && colors.length >= MAX_OUTFIT_COLORS
            return (
              <li key={c.key}>
                <button
                  type="button"
                  aria-pressed={selected}
                  disabled={disabled}
                  onClick={() => toggleColor(c.key)}
                  className={cn(
                    'flex min-h-9 items-center gap-1.5 rounded-full border bg-background py-1 pr-3 pl-1.5 text-xs font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring disabled:opacity-40',
                    selected
                      ? 'border-primary-strong bg-primary/15 font-semibold text-foreground'
                      : dressColors.includes(c.key)
                        ? 'border-dashed border-primary-strong text-foreground'
                        : 'border-border text-muted-foreground hover:text-foreground',
                  )}
                >
                  <span
                    className="grid size-5 place-items-center rounded-full ring-1 ring-black/10"
                    style={{ backgroundColor: c.hex }}
                    aria-hidden="true"
                  >
                    {selected && (
                      <Check className="size-3.5" style={{ color: isLightColor(c.hex) ? '#1f1f1f' : '#ffffff' }} />
                    )}
                  </span>
                  {c.label}
                </button>
              </li>
            )
          })}
        </ul>
      </fieldset>

      <FormField id="outfit-note" label="Ghi chú" optional>
        <Textarea
          id="outfit-note"
          rows={2}
          maxLength={300}
          placeholder="VD: váy trắng + mũ cói, có thể đổi sang áo be"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </FormField>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <DialogFooter className="gap-2 sm:justify-between">
        {current ? (
          <Button type="button" variant="ghost" className="text-destructive" disabled={pending} onClick={onRemove}>
            Gỡ outfit
          </Button>
        ) : (
          <span className="hidden sm:block" />
        )}
        <div className="flex flex-col-reverse gap-2 sm:flex-row">
          <Button type="button" variant="outline" disabled={pending} onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? 'Đang lưu…' : 'Lưu outfit'}
          </Button>
        </div>
      </DialogFooter>
    </form>
  )
}
