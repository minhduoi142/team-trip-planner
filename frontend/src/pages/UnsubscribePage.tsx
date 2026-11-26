import { AlertCircle, CheckCircle2, Loader2, MailMinus, type LucideIcon } from 'lucide-react'
import { Link, useSearchParams } from 'react-router'
import { useAuth } from '@/auth/useAuth'
import { AuthShell } from '@/components/AuthShell'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useUnsubscribe } from '@/hooks/useNotificationSettings'
import { useTrip } from '@/hooks/useTrips'
import { getErrorMessage } from '@/lib/api'
import { CATEGORY_LABELS, parseUnsubscribeScope, type UnsubscribeScope } from '@/lib/unsubscribeToken'
import { cn } from '@/lib/utils'
import type { UnsubscribeResponse } from '@/types/notification'

/**
 * Mở từ link "Huỷ nhận" trong email. KHÔNG tự huỷ khi tải trang: trình quét link của hộp thư có thể tự mở link,
 * nên phải bấm xác nhận.
 */
export function UnsubscribePage() {
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const scope = token ? parseUnsubscribeScope(token) : null
  const { status } = useAuth()
  const unsubscribe = useUnsubscribe()

  // Token không chứa tên chuyến; nếu đang đăng nhập thì lấy tên từ chi tiết chuyến (NaN = không gọi API)
  const tripId = scope?.kind === 'TRIP' && status === 'authenticated' ? tripIdFromToken(token) : NaN
  const trip = useTrip(tripId)
  const tripTitle = trip.data?.title ?? null

  const home = status === 'authenticated' ? '/trips' : '/'
  const homeLabel = status === 'authenticated' ? 'Về trang chuyến đi' : 'Về trang chủ'

  let Icon: LucideIcon = MailMinus
  let tone = 'text-primary-strong'
  let title = describe(scope, tripTitle)
  let message = 'Bạn sẽ không nhận các email này nữa. Có thể bật lại bất cứ lúc nào trong Hồ sơ → Thông báo.'
  if (!scope) {
    Icon = AlertCircle
    tone = 'text-destructive'
    title = 'Liên kết huỷ nhận không hợp lệ'
    message = 'Hãy mở lại đúng link ở cuối email, hoặc tắt thông báo trong Hồ sơ → Thông báo.'
  } else if (unsubscribe.isPending) {
    Icon = Loader2
    tone = 'text-muted-foreground'
  } else if (unsubscribe.isSuccess) {
    Icon = CheckCircle2
    tone = 'text-success'
    title = doneTitle(unsubscribe.data)
    message = 'Muốn nhận lại thì vào Hồ sơ → Thông báo nhé.'
  } else if (unsubscribe.isError) {
    Icon = AlertCircle
    tone = 'text-destructive'
    title = 'Chưa huỷ được'
    message = getErrorMessage(unsubscribe.error)
  }

  const canConfirm = scope && !unsubscribe.isSuccess

  return (
    <AuthShell>
      <Card className="rounded-overlay">
        <CardContent className="grid justify-items-center gap-4 p-8 text-center">
          <Icon className={cn('size-12', tone, Icon === Loader2 && 'animate-spin')} aria-hidden="true" />
          <div role="status" aria-live="polite" className="grid gap-2">
            <h1 className="text-xl font-bold break-words text-foreground">{title}</h1>
            <p className="text-sm break-words text-muted-foreground">{message}</p>
          </div>
          <div className="grid w-full gap-2">
            {canConfirm && (
              <Button disabled={unsubscribe.isPending} onClick={() => unsubscribe.mutate(token)}>
                {unsubscribe.isPending ? 'Đang huỷ…' : 'Xác nhận huỷ nhận'}
              </Button>
            )}
            <Button asChild variant="outline">
              <Link to={home}>{homeLabel}</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </AuthShell>
  )
}

/** Payload token (không bí mật) dạng "u1|{userId}|TRIP:{tripId}"; chỉ dùng để hiển thị. */
function tripIdFromToken(token: string): number {
  try {
    const base64 = (token.split('.')[0] ?? '').replace(/-/g, '+').replace(/_/g, '/')
    const text = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '='))
    const match = text.match(/\|TRIP:(\d+)$/)
    return match ? Number(match[1]) : NaN
  } catch {
    return NaN
  }
}

function describe(scope: UnsubscribeScope | null, tripTitle: string | null): string {
  if (!scope) return ''
  switch (scope.kind) {
    case 'ALL':
      return 'Tắt mọi email từ Trip Planner?'
    case 'CATEGORY':
      return `Tắt email ${CATEGORY_LABELS[scope.category]}?`
    case 'TRIP':
      return tripTitle ? `Tắt email của chuyến “${tripTitle}”?` : 'Tắt email của chuyến đi này?'
  }
}

function doneTitle(result: UnsubscribeResponse): string {
  if (result.scope === 'ALL') return 'Đã tắt mọi email'
  if (result.scope === 'CATEGORY' && result.category) return `Đã tắt email ${CATEGORY_LABELS[result.category]}`
  return result.tripTitle ? `Đã tắt email của chuyến “${result.tripTitle}”` : 'Đã tắt email của chuyến này'
}
