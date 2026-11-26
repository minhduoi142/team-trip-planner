import { Ticket } from 'lucide-react'
import { useInvitePreview } from '@/hooks/useTrips'
import { inviteCodeFromReturnTo } from '@/lib/inviteCode'

/**
 * Trên trang đăng nhập/đăng ký: nếu người dùng đến từ link mời (returnTo = /join/{mã}) thì nhắc tên chuyến
 * và cho biết xong bước này là vào nhóm luôn.
 */
export function InviteHint({ returnTo, action }: { returnTo: string | null; action: string }) {
  const code = inviteCodeFromReturnTo(returnTo)
  const preview = useInvitePreview(code ?? '')
  if (!code) return null

  return (
    <div className="flex items-start gap-2.5 rounded-item border border-primary/20 bg-primary/5 px-3.5 py-3 text-sm text-foreground">
      <Ticket className="mt-0.5 size-4 shrink-0 text-primary-strong" aria-hidden="true" />
      <p>
        Bạn được mời vào {preview.data ? <b className="break-words">{preview.data.title}</b> : 'một chuyến đi'}.{' '}
        {action} xong là vào nhóm ngay.
      </p>
    </div>
  )
}
