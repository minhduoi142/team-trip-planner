import { Link, useSearchParams } from 'react-router'
import { useAuth } from '@/auth/useAuth'
import { AuthShell } from '@/components/AuthShell'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useUnsubscribe } from '@/hooks/useNotificationSettings'
import { getErrorMessage } from '@/lib/api'
import { CATEGORY_LABELS, parseUnsubscribeScope, type UnsubscribeScope } from '@/lib/unsubscribeToken'
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

  const home = status === 'authenticated' ? '/trips' : '/'
  const homeLabel = status === 'authenticated' ? 'Về trang chuyến đi' : 'Về trang chủ'

  let emoji = '📭'
  let title = describe(scope)
  let message = 'Bạn sẽ không nhận các email này nữa. Có thể bật lại bất cứ lúc nào trong Hồ sơ → Thông báo.'
  if (!scope) {
    emoji = '🥲'
    title = 'Liên kết huỷ nhận không hợp lệ'
    message = 'Hãy mở lại đúng link ở cuối email, hoặc tắt thông báo trong Hồ sơ → Thông báo.'
  } else if (unsubscribe.isSuccess) {
    emoji = '✅'
    title = doneTitle(unsubscribe.data)
    message = 'Muốn nhận lại thì vào Hồ sơ → Thông báo nhé.'
  } else if (unsubscribe.isError) {
    emoji = '🥲'
    title = 'Chưa huỷ được'
    message = getErrorMessage(unsubscribe.error)
  }

  const canConfirm = scope && !unsubscribe.isSuccess

  return (
    <AuthShell>
      <Card className="rounded-[32px] border-2 border-white/80 bg-card/95 shadow-clay-card">
        <CardContent className="space-y-4 p-8 text-center">
          <p className="text-5xl">{emoji}</p>
          <h1 className="text-xl font-bold text-foreground">{title}</h1>
          <p className="text-sm font-medium text-muted-foreground">{message}</p>
          <div className="flex flex-col gap-2">
            {canConfirm && (
              <Button
                className="rounded-full"
                disabled={unsubscribe.isPending}
                onClick={() => unsubscribe.mutate(token)}
              >
                {unsubscribe.isPending ? 'Đang huỷ…' : 'Xác nhận huỷ nhận'}
              </Button>
            )}
            <Button asChild variant="outline" className="rounded-full shadow-clay-card">
              <Link to={home}>{homeLabel}</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </AuthShell>
  )
}

function describe(scope: UnsubscribeScope | null): string {
  if (!scope) return ''
  switch (scope.kind) {
    case 'ALL':
      return 'Tắt mọi email từ Trip Planner?'
    case 'CATEGORY':
      return `Tắt email ${CATEGORY_LABELS[scope.category]}?`
    case 'TRIP':
      return 'Tắt email của chuyến đi này?'
  }
}

function doneTitle(result: UnsubscribeResponse): string {
  if (result.scope === 'ALL') return 'Đã tắt mọi email'
  if (result.scope === 'CATEGORY' && result.category) return `Đã tắt email ${CATEGORY_LABELS[result.category]}`
  return result.tripTitle ? `Đã tắt email của chuyến “${result.tripTitle}”` : 'Đã tắt email của chuyến này'
}
