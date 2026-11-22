import { Pencil, Shirt } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { dressColor } from '@/lib/dressColors'
import type { ItineraryDayResponse } from '@/types/itinerary'

interface DressCodeCardProps {
  day: ItineraryDayResponse
  canEdit: boolean
  onEdit: () => void
}

export function DressCodeCard({ day, canEdit, onEdit }: DressCodeCardProps) {
  const { dress } = day
  const hasDress = Boolean(dress.theme || dress.note || dress.imageUrl || dress.colors.length > 0)

  if (!hasDress && !day.note) {
    return canEdit ? (
      <button
        type="button"
        onClick={onEdit}
        className="flex w-full items-center justify-center gap-2 rounded-3xl border-2 border-dashed border-rose-200 bg-rose-50/50 px-4 py-4 text-sm font-medium text-rose-600 transition hover:bg-rose-50"
      >
        <Shirt className="size-4" />
        Thêm dress code cho ngày này ✨
      </button>
    ) : null
  }

  return (
    <div className="flex gap-4 rounded-3xl bg-gradient-to-br from-rose-50 via-fuchsia-50 to-violet-50 p-4 ring-1 ring-border">
      {dress.imageUrl && (
        <a href={dress.imageUrl} target="_blank" rel="noreferrer" className="shrink-0" aria-label="Xem ảnh mẫu">
          <img
            src={dress.imageUrl}
            alt="Ảnh mẫu dress code"
            className="size-20 rounded-2xl object-cover ring-1 ring-border"
            referrerPolicy="no-referrer"
          />
        </a>
      )}
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-medium text-rose-600">Dress code</p>
            <p className="font-semibold">{dress.theme ?? 'Chưa đặt chủ đề'}</p>
          </div>
          {canEdit && (
            <Button variant="ghost" size="icon-sm" aria-label="Sửa dress code" onClick={onEdit}>
              <Pencil />
            </Button>
          )}
        </div>
        {dress.colors.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {dress.colors.map((key) => {
              const color = dressColor(key)
              return color ? (
                <span key={key} className="flex items-center gap-1 rounded-full bg-background/80 py-0.5 pr-2 pl-0.5 text-xs">
                  <span className="size-4 rounded-full ring-1 ring-border" style={{ backgroundColor: color.hex }} />
                  {color.label}
                </span>
              ) : null
            })}
          </div>
        )}
        {dress.note && <p className="text-sm text-muted-foreground">{dress.note}</p>}
        {day.note && <p className="text-sm">📌 {day.note}</p>}
      </div>
    </div>
  )
}
