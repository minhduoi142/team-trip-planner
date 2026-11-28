import { BadgeCheck, MoreVertical, Pencil, Plus, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { ChoiceChips } from '@/components/common/ChoiceChips'
import { UserAvatar } from '@/components/UserAvatar'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { dressColor } from '@/lib/dressColors'
import { matchesDressCode, sharedColorsText } from '@/lib/outfits'
import type { DayOutfitsResponse, OutfitResponse } from '@/types/outfit'
import { OutfitThumb } from './OutfitThumb'

interface OutfitDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  days: DayOutfitsResponse[]
  dayId: number
  onDayChange: (dayId: number) => void
  /** Cuộn tới thẻ của người này khi mở */
  focusUserId: number | null
  dressColorsOf: (dayId: number) => string[]
  onEditMine: (dayId: number) => void
  onRemove: (dayId: number, outfit: OutfitResponse) => void
}

/** Lưới outfit của mọi người trong một ngày, đổi ngày bằng các viên "Ngày N" (docs/sdd-golden-hour-outfit.md B.6). */
export function OutfitDialog(props: OutfitDialogProps) {
  const { open, onOpenChange, days, dayId, onDayChange, focusUserId, dressColorsOf, onEditMine, onRemove } = props
  const day = days.find((d) => d.dayId === dayId)
  const outfits = day?.outfits ?? []
  const dress = dressColorsOf(dayId)
  const shared = sharedColorsText(outfits)
  const hasMine = outfits.some((o) => o.mine)
  const listRef = useRef<HTMLUListElement>(null)

  useEffect(() => {
    if (!open || focusUserId === null) return
    const timer = window.setTimeout(() => {
      listRef.current
        ?.querySelector(`[data-user-id="${focusUserId}"]`)
        ?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }, 50)
    return () => window.clearTimeout(timer)
  }, [open, focusUserId, dayId])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92svh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Outfit của nhóm</DialogTitle>
          <DialogDescription>Xem mọi người định mặc gì để phối cho hợp khi chụp ảnh chung.</DialogDescription>
        </DialogHeader>

        {days.length > 1 && (
          <div className="no-scrollbar -mx-6 overflow-x-auto px-6">
            <ChoiceChips
              label="Chọn ngày"
              className="flex-nowrap"
              size="sm"
              value={String(dayId)}
              onChange={(v) => onDayChange(Number(v))}
              options={days.map((d) => ({
                value: String(d.dayId),
                label: `Ngày ${d.dayIndex}${d.outfits.length ? ` (${d.outfits.length})` : ''}`,
              }))}
            />
          </div>
        )}

        {shared && <p className="text-sm text-muted-foreground">{shared}</p>}

        {!hasMine && (
          <Button variant="outline" className="justify-self-start" onClick={() => onEditMine(dayId)}>
            <Plus />
            Thêm outfit của bạn
          </Button>
        )}

        {outfits.length === 0 ? (
          <p className="rounded-surface border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
            Chưa ai đăng outfit cho ngày này.
          </p>
        ) : (
          <ul ref={listRef} className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            {outfits.map((outfit) => (
              <OutfitCard
                key={outfit.userId}
                outfit={outfit}
                matches={matchesDressCode(outfit, dress)}
                onEdit={() => onEditMine(dayId)}
                onRemove={() => onRemove(dayId, outfit)}
              />
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  )
}

function OutfitCard({
  outfit,
  matches,
  onEdit,
  onRemove,
}: {
  outfit: OutfitResponse
  matches: boolean
  onEdit: () => void
  onRemove: () => void
}) {
  const [index, setIndex] = useState(0)
  const name = outfit.mine ? 'Bạn' : outfit.displayName
  const photos = outfit.photoUrls

  return (
    <li
      data-user-id={outfit.userId}
      className="grid min-w-0 content-start gap-2 rounded-surface border border-border bg-card p-2 sm:p-3"
    >
      <div className="relative">
        {photos.length > 1 ? (
          <div
            className="no-scrollbar flex aspect-3/4 snap-x snap-mandatory overflow-x-auto rounded-item border border-border"
            onScroll={(e) => {
              const el = e.currentTarget
              setIndex(Math.round(el.scrollLeft / el.clientWidth))
            }}
            aria-label={`Ảnh outfit của ${name}, vuốt ngang để xem ${photos.length} ảnh`}
          >
            {photos.map((url, i) => (
              <img
                key={`${url}-${i}`}
                src={url}
                alt={`Outfit của ${name}, ảnh ${i + 1}`}
                loading="lazy"
                className="size-full shrink-0 snap-center object-cover"
              />
            ))}
          </div>
        ) : (
          <OutfitThumb outfit={outfit} className="aspect-3/4 w-full" />
        )}
        {photos.length > 1 && (
          <span className="absolute right-2 bottom-2 rounded-full bg-black/60 px-2 py-0.5 text-2xs font-semibold text-white tabular-nums">
            {index + 1}/{photos.length}
          </span>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        <UserAvatar userId={outfit.userId} name={outfit.displayName} avatarUrl={outfit.avatarUrl} size="sm" />
        <p className="min-w-0 flex-1 truncate text-sm font-semibold">{name}</p>
        {outfit.mine ? (
          <Button variant="ghost" size="icon-sm" aria-label="Sửa outfit của bạn" onClick={onEdit}>
            <Pencil />
          </Button>
        ) : (
          outfit.canDelete && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm" aria-label={`Tùy chọn cho outfit của ${name}`}>
                  <MoreVertical />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem variant="destructive" onSelect={onRemove}>
                  <Trash2 />
                  Gỡ outfit
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )
        )}
      </div>

      {(outfit.colors.length > 0 || matches) && (
        <ul className="flex flex-wrap gap-1" aria-label="Tông màu">
          {outfit.colors.map((key) => {
            const color = dressColor(key)
            return color ? (
              <li
                key={key}
                className="flex items-center gap-1 rounded-full border border-border py-0.5 pr-2 pl-0.5 text-2xs font-medium"
              >
                <span
                  className="size-3.5 rounded-full ring-1 ring-black/10"
                  style={{ backgroundColor: color.hex }}
                  aria-hidden="true"
                />
                {color.label}
              </li>
            ) : null
          })}
          {matches && (
            <li className="flex items-center gap-1 rounded-full bg-success-soft px-2 py-0.5 text-2xs font-semibold text-success-soft-foreground">
              <BadgeCheck className="size-3" aria-hidden="true" />
              Hợp tông
            </li>
          )}
        </ul>
      )}

      {outfit.note && <p className="text-sm whitespace-pre-line break-words text-muted-foreground">{outfit.note}</p>}
    </li>
  )
}
