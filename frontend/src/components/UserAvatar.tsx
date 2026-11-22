import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

const FALLBACK_COLORS = [
  'bg-rose-100 text-rose-700 shadow-clay-badge',
  'bg-fuchsia-100 text-fuchsia-700 shadow-clay-badge',
  'bg-violet-100 text-violet-700 shadow-clay-badge',
  'bg-sky-100 text-sky-700 shadow-clay-badge',
  'bg-teal-100 text-teal-700 shadow-clay-badge',
  'bg-amber-100 text-amber-700 shadow-clay-badge',
  'bg-orange-100 text-orange-700 shadow-clay-badge',
  'bg-lime-100 text-lime-700 shadow-clay-badge',
]

function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return '?'
  // Tên Việt: lấy chữ cái của từ cuối (tên gọi)
  return words[words.length - 1].charAt(0).toUpperCase()
}

interface UserAvatarProps {
  userId: number
  name: string
  avatarUrl: string | null
  size?: 'sm' | 'default' | 'lg'
  className?: string
}

export function UserAvatar({ userId, name, avatarUrl, size = 'default', className }: UserAvatarProps) {
  return (
      <Avatar
        size={size}
        className={cn(
          'ring-2 ring-card shadow-clay-badge transition-transform duration-200 hover:scale-105 active:scale-95',
          className
        )}
      >
        {avatarUrl && <AvatarImage src={avatarUrl} alt={name} referrerPolicy="no-referrer" />}
        <AvatarFallback className={cn('font-semibold', FALLBACK_COLORS[Math.abs(userId) % FALLBACK_COLORS.length])}>
          {initials(name)}
        </AvatarFallback>
      </Avatar>
      )
}
