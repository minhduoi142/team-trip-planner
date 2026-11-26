import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

/** Màu avatar chữ cái lấy từ token avatar-1..8 (index.css). */
const FALLBACK_COLORS = [
  'bg-avatar-1 text-avatar-1-foreground',
  'bg-avatar-2 text-avatar-2-foreground',
  'bg-avatar-3 text-avatar-3-foreground',
  'bg-avatar-4 text-avatar-4-foreground',
  'bg-avatar-5 text-avatar-5-foreground',
  'bg-avatar-6 text-avatar-6-foreground',
  'bg-avatar-7 text-avatar-7-foreground',
  'bg-avatar-8 text-avatar-8-foreground',
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
    <Avatar size={size} className={cn('ring-2 ring-card', className)}>
      {avatarUrl && <AvatarImage src={avatarUrl} alt={name} referrerPolicy="no-referrer" />}
      <AvatarFallback className={cn('font-semibold', FALLBACK_COLORS[Math.abs(userId) % FALLBACK_COLORS.length])}>
        {initials(name)}
      </AvatarFallback>
    </Avatar>
  )
}
