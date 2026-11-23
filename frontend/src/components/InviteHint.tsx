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
    <div className="flex items-start gap-2.5 rounded-2xl border border-rose-200/80 bg-rose-50/80 px-3.5 py-3 text-sm text-foreground">
      <Ticket className="mt-0.5 size-4 shrink-0 text-primary" />
      <p>
        Bạn được mời vào {preview.data ? <b>{preview.data.title}</b> : 'một chuyến đi'}. {action} xong là vào nhóm ngay.
      </p>
    </div>
  )
}
