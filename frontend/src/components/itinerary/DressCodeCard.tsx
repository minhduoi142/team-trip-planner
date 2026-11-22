import { Pencil, Shirt, Sparkles } from 'lucide-react'
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
        className="group flex w-full items-center justify-center gap-2 rounded-3xl border-2 border-dashed border-rose-300 bg-rose-50/50 px-4 py-4 text-sm font-semibold text-rose-600 shadow-clay-card transition-all duration-300 hover:-translate-y-0.5 hover:bg-rose-100/60 hover:shadow-clay-card-hover active:translate-y-0.5 active:shadow-clay-pressed"
      >
        <Shirt className="size-4.5 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6 text-rose-500" />
        Thêm dress code cho ngày này ✨
      </button>
    ) : null
  }

  return (
            <div className="relative overflow-hidden rounded-[28px] border-2 border-white/80 bg-gradient-to-br from-rose-50/90 via-fuchsia-50/70 to-violet-50/90 p-4 sm:p-5 shadow-clay-card backdrop-blur-xs transition-all duration-300">
              {/* Decorative subtle sparkle watermark in corner */}
              <div className="pointer-events-none absolute -right-3 -top-3 size-20 rounded-full bg-rose-200/20 blur-xl" />

              <div className="flex gap-4">
                {dress.imageUrl && (
                  <a
                    href={dress.imageUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="group relative shrink-0"
                    aria-label="Xem ảnh mẫu"
                  >
                    <img
                      src={dress.imageUrl}
                      alt="Ảnh mẫu dress code"
                      className="size-20 rounded-2xl object-cover border-2 border-white/90 shadow-clay-card transition-transform duration-300 group-hover:scale-105"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 rounded-2xl ring-1 ring-black/5" />
                  </a>
                )}
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-rose-600">
                        <Sparkles className="size-3.5" />
                        Dress code
                      </div>
                      <p className="mt-0.5 text-base font-bold text-foreground truncate">
                        {dress.theme ?? 'Chưa đặt chủ đề'}
                      </p>
                    </div>
                    {canEdit && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Sửa dress code"
                        onClick={onEdit}
                        className="shrink-0 rounded-full border border-white/80 bg-white/70 shadow-clay-badge hover:bg-white"
                      >
                        <Pencil className="size-3.5 text-foreground" />
                      </Button>
                    )}
                  </div>

          {dress.colors.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-0.5">
                      {dress.colors.map((key) => {
                        const color = dressColor(key)
                        return color ? (
                          <span
                            key={key}
                            className="flex items-center gap-1.5 rounded-full border border-white/90 bg-white/90 py-1 pr-3 pl-1.5 text-xs font-semibold shadow-clay-badge text-foreground transition-transform hover:scale-105"
                          >
                            <span
                              className="size-4.5 rounded-full ring-2 ring-white/90 shadow-[inset_0_2px_3px_rgba(255,255,255,0.7),0_2px_3px_rgba(0,0,0,0.15)]"
                              style={{ backgroundColor: color.hex }}
                            />
                            {color.label}
                          </span>
                        ) : null
                      })}
                    </div>
                  )}

                  {dress.note && (
                    <p className="rounded-xl bg-white/60 px-3 py-1.5 text-xs text-muted-foreground border border-white/50 shadow-clay-sunken">
                      {dress.note}
                    </p>
                  )}
                  {day.note && (
                    <p className="text-xs font-medium text-foreground/90">
                      📌 {day.note}
                    </p>
                  )}
                </div>
              </div>
            </div>
            )
}
