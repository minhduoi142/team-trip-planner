import { Plus, Shirt } from 'lucide-react'
import { UserAvatar } from '@/components/UserAvatar'
import { Button } from '@/components/ui/button'
import { sharedColorsText } from '@/lib/outfits'
import type { OutfitResponse } from '@/types/outfit'
import { OutfitThumb } from './OutfitThumb'

interface OutfitStripProps {
  outfits: OutfitResponse[]
  memberCount: number
  /** Mở lưới outfit của ngày, cuộn tới người này (null = đầu danh sách) */
  onOpen: (userId: number | null) => void
  onEditMine: () => void
}

/**
 * Dải "Outfit của nhóm" trong phần tóm tắt của ngày, ngay dưới dress code (docs/sdd-golden-hour-outfit.md B.6).
 * Một hàng cuộn ngang: ô đầu là outfit của mình (hoặc nút thêm), sau đó outfit của mọi người.
 */
export function OutfitStrip({ outfits, memberCount, onOpen, onEditMine }: OutfitStripProps) {
  const mine = outfits.find((o) => o.mine)
  const shared = sharedColorsText(outfits)

  return (
    <section aria-label="Outfit của nhóm" className="grid gap-2 px-4 py-3">
      <div className="flex items-center justify-between gap-2">
        <p className="flex min-w-0 items-center gap-1.5 text-sm font-semibold text-foreground">
          <Shirt className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <span className="min-w-0">
            Outfit của nhóm{' '}
            <span className="font-normal whitespace-nowrap text-muted-foreground">
              · {outfits.length}/{memberCount}
              <span className="sr-only"> người đã đăng</span>
            </span>
          </span>
        </p>
        {outfits.length > 0 && (
          <Button variant="ghost" size="sm" className="-mr-2 text-primary-strong" onClick={() => onOpen(null)}>
            Xem tất cả
          </Button>
        )}
      </div>

      <ul className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
        {!mine && (
          <li className="shrink-0">
            <button
              type="button"
              onClick={onEditMine}
              className="grid w-16 justify-items-center gap-1 rounded-item outline-none focus-visible:ring-3 focus-visible:ring-ring"
            >
              <span className="grid size-14 place-items-center rounded-item border border-dashed border-primary text-primary-strong">
                <Plus className="size-5" aria-hidden="true" />
              </span>
              <span className="text-2xs leading-tight font-medium text-primary-strong">Outfit của bạn</span>
            </button>
          </li>
        )}
        {outfits.map((outfit) => {
          const name = outfit.mine ? 'Bạn' : outfit.displayName
          return (
            <li key={outfit.userId} className="shrink-0">
              <button
                type="button"
                onClick={() => onOpen(outfit.userId)}
                aria-label={`Xem outfit của ${name}`}
                className="grid w-16 justify-items-center gap-1 rounded-item outline-none focus-visible:ring-3 focus-visible:ring-ring"
              >
                <span className="relative">
                  <OutfitThumb outfit={outfit} className="size-14" />
                  <UserAvatar
                    userId={outfit.userId}
                    name={outfit.displayName}
                    avatarUrl={outfit.avatarUrl}
                    size="sm"
                    className="absolute -right-1.5 -bottom-1.5"
                  />
                </span>
                <span className="w-full truncate text-center text-2xs leading-tight text-foreground">{name}</span>
              </button>
            </li>
          )
        })}
      </ul>

      {shared && <p className="text-xs text-muted-foreground">{shared}</p>}
    </section>
  )
}
