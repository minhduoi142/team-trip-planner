import { useState, type ReactNode } from 'react'
import { resolveCover } from '@/lib/covers'
import { cn } from '@/lib/utils'

interface TripCoverProps {
  coverImageUrl: string | null
  /** Dùng để chọn gradient mặc định khi không có ảnh bìa */
  seed: number
  className?: string
  /** Phủ lớp tối phía dưới để chữ trắng dễ đọc */
  withOverlay?: boolean
  children?: ReactNode
}

export function TripCover({ coverImageUrl, seed, className, withOverlay = false, children }: TripCoverProps) {
  const [broken, setBroken] = useState(false)
  const cover = resolveCover(broken ? null : coverImageUrl, seed)

  return (
    <div className={cn('relative overflow-hidden', className)}>
      {cover.kind === 'image' ? (
        <img
          src={cover.url}
          alt=""
          className="absolute inset-0 size-full object-cover"
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setBroken(true)}
        />
      ) : (
        <div className={cn('absolute inset-0 bg-gradient-to-br', cover.preset.gradient)}>
          <cover.preset.icon className="absolute -right-3 -bottom-4 size-24 text-white/25" strokeWidth={1.25} />
        </div>
      )}
      {withOverlay && <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/15 to-transparent" />}
      {children && <div className="relative h-full">{children}</div>}
    </div>
  )
}
