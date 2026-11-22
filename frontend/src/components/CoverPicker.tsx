import { Check, Link2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { COVER_PRESETS, presetValue, resolveCover } from '@/lib/covers'
import { cn } from '@/lib/utils'
import { ImageUploadButton } from './ImageUploadButton'
import { TripCover } from './TripCover'

interface CoverPickerProps {
  value: string
  onChange: (value: string) => void
  error?: string
}

/** Chọn 1 gradient mặc định, hoặc dán link ảnh (http/https). */
export function CoverPicker({ value, onChange, error }: CoverPickerProps) {
  const resolved = value ? resolveCover(value) : null
  const isUrl = resolved?.kind === 'image'

  return (
    <div className="grid gap-3">
      <TripCover key={value} coverImageUrl={value || null} seed={0} className="h-28 rounded-2xl ring-1 ring-border" />

      <div className="grid grid-cols-6 gap-2" role="radiogroup" aria-label="Ảnh bìa mặc định">
        {COVER_PRESETS.map((preset) => {
          const selected = value === presetValue(preset.key)
          return (
            <button
              key={preset.key}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={preset.label}
              title={preset.label}
              onClick={() => onChange(presetValue(preset.key))}
              className={cn(
                'relative aspect-square rounded-xl bg-gradient-to-br ring-offset-2 transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                preset.gradient,
                selected && 'ring-2 ring-primary',
              )}
            >
              {selected && <Check className="absolute inset-0 m-auto size-5 text-white drop-shadow" />}
            </button>
          )
        })}
      </div>

      <div className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <Link2 className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="coverImageUrl"
            inputMode="url"
            placeholder="Hoặc dán link ảnh (https://…)"
            className="pl-9"
            value={isUrl ? value : ''}
            aria-invalid={Boolean(error)}
            onChange={(e) => onChange(e.target.value.trim())}
          />
        </div>
        <ImageUploadButton purpose="TRIP_COVER" label="Tải ảnh" onUploaded={onChange} className="shrink-0" />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
