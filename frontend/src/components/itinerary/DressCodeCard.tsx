import { Pencil, Pin, Plus, Shirt } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { dressColor } from '@/lib/dressColors'
import type { ItineraryDayResponse } from '@/types/itinerary'

interface DressCodeCardProps {
  day: ItineraryDayResponse
  canEdit: boolean
  onEdit: () => void
}

/**
 * Phần dress code + ghi chú ngày trong dải tóm tắt của ngày (docs/ui-slop-audit.md P3-LT-10, P3-LT-16):
 * không vỏ card riêng, không emoji, chip màu tĩnh.
 */
export function DressCodeCard({ day, canEdit, onEdit }: DressCodeCardProps) {
  const { dress } = day
  const hasDress = Boolean(dress.theme || dress.note || dress.imageUrl || dress.colors.length > 0)

  if (!hasDress && !day.note) {
    return canEdit ? (
      <div className="px-2 py-1.5">
        <Button variant="ghost" onClick={onEdit} className="w-full justify-start text-primary-strong">
          <Plus />
          Thêm dress code, ghi chú cho ngày này
        </Button>
      </div>
    ) : null
  }

  return (
    <section aria-label="Dress code và ghi chú ngày" className="flex gap-3 p-4">
      {dress.imageUrl && (
        <a
          href={dress.imageUrl}
          target="_blank"
          rel="noreferrer"
          className="shrink-0 rounded-item outline-none focus-visible:ring-3 focus-visible:ring-ring"
          aria-label="Xem ảnh mẫu dress code"
        >
          <img
            src={dress.imageUrl}
            alt="Ảnh mẫu dress code"
            className="size-16 rounded-item border border-border object-cover"
            referrerPolicy="no-referrer"
          />
        </a>
      )}
      <div className="grid min-w-0 flex-1 gap-2">
        <div className="flex items-start justify-between gap-2">
          {hasDress ? (
            <div className="min-w-0">
              <p className="flex items-center gap-1 text-xs font-semibold text-muted-foreground">
                <Shirt className="size-3.5" aria-hidden="true" />
                Dress code
              </p>
              <p className="mt-0.5 line-clamp-2 font-semibold break-words text-foreground">
                {dress.theme ?? 'Chưa đặt chủ đề'}
              </p>
            </div>
          ) : (
            <p className="flex items-start gap-1.5 text-sm break-words text-foreground">
              <Pin className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
              <span className="min-w-0 whitespace-pre-line">{day.note}</span>
            </p>
          )}
          {canEdit && (
            <Button variant="ghost" size="icon-sm" aria-label="Sửa thông tin ngày" onClick={onEdit} className="-mt-1">
              <Pencil />
            </Button>
          )}
        </div>

        {dress.colors.length > 0 && (
          <ul className="flex flex-wrap gap-1.5" aria-label="Tông màu">
            {dress.colors.map((key) => {
              const color = dressColor(key)
              return color ? (
                <li
                  key={key}
                  className="flex items-center gap-1.5 rounded-full border border-border bg-background py-1 pr-2.5 pl-1 text-xs font-medium text-foreground"
                >
                  <span
                    className="size-4 rounded-full ring-1 ring-black/10"
                    style={{ backgroundColor: color.hex }}
                    aria-hidden="true"
                  />
                  {color.label}
                </li>
              ) : null
            })}
          </ul>
        )}

        {dress.note && <p className="text-sm whitespace-pre-line break-words text-muted-foreground">{dress.note}</p>}
        {hasDress && day.note && (
          <p className="flex items-start gap-1.5 text-sm break-words text-foreground">
            <Pin className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span className="min-w-0 whitespace-pre-line">{day.note}</span>
          </p>
        )}
      </div>
    </section>
  )
}
