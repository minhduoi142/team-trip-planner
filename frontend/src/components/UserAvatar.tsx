import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

const FALLBACK_COLORS = [
  'bg-rose-100 text-rose-700',
  'bg-fuchsia-100 text-fuchsia-700',
  'bg-violet-100 text-violet-700',
  'bg-sky-100 text-sky-700',
  'bg-teal-100 text-teal-700',
  'bg-amber-100 text-amber-700',
  'bg-orange-100 text-orange-700',
  'bg-lime-100 text-lime-700',
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
    <Avatar size={size} className={className}>
      {avatarUrl && <AvatarImage src={avatarUrl} alt={name} referrerPolicy="no-referrer" />}
      <AvatarFallback className={cn('font-semibold', FALLBACK_COLORS[Math.abs(userId) % FALLBACK_COLORS.length])}>
        {initials(name)}
      </AvatarFallback>
    </Avatar>
  )
}
