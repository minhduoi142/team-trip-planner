import { Shirt } from 'lucide-react'
import { useState } from 'react'
import { dressColor } from '@/lib/dressColors'
import { cn } from '@/lib/utils'
import type { OutfitResponse } from '@/types/outfit'

/**
 * Ảnh đại diện của một outfit: ảnh đầu tiên; chưa có ảnh (hoặc ảnh lỗi) thì các sọc màu đã chọn;
 * không có màu thì biểu tượng áo.
 */
export function OutfitThumb({ outfit, className }: { outfit: OutfitResponse; className?: string }) {
  const [broken, setBroken] = useState(false)
  const photo = outfit.photoUrls[0]
  const colors = outfit.colors.map((key) => dressColor(key)).filter((c) => c !== undefined)
  return (
    <span className={cn('block overflow-hidden rounded-item border border-border bg-muted', className)}>
      {photo && !broken ? (
        <img
          src={photo}
          alt=""
          loading="lazy"
          decoding="async"
          className="size-full object-cover"
          onError={() => setBroken(true)}
        />
      ) : colors.length > 0 ? (
        <span className="flex size-full" aria-hidden="true">
          {colors.map((c) => (
            <span key={c.key} className="h-full flex-1" style={{ backgroundColor: c.hex }} />
          ))}
        </span>
      ) : (
        <span className="flex size-full items-center justify-center text-muted-foreground">
          <Shirt className="size-5" aria-hidden="true" />
        </span>
      )}
    </span>
  )
}
