import { AlertCircle, Loader2, MailCheck, MailX, type LucideIcon } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { Link, useSearchParams } from 'react-router'
import { useAuth } from '@/auth/useAuth'
import { AuthShell } from '@/components/AuthShell'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useVerifyEmail } from '@/hooks/useNotificationSettings'
import { getErrorMessage } from '@/lib/api'
import { loginPath } from '@/lib/redirect'
import { cn } from '@/lib/utils'

/** Mở thẳng dialog Hồ sơ ở mục Thông báo (AppLayout đọc ?profile=) */
const NOTIFICATION_SETTINGS_PATH = '/trips?profile=notifications'

/** Mở từ link trong mail xác minh: public, vì người dùng hay mở trên điện thoại chưa đăng nhập. */
export function VerifyEmailPage() {
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const { status } = useAuth()
  const verify = useVerifyEmail()
  const { mutate } = verify

  // Gọi đúng 1 lần (StrictMode chạy effect 2 lần; token dùng xong là hết hiệu lực)
  const started = useRef(false)
  useEffect(() => {
    if (token && !started.current) {
      started.current = true
      mutate(token)
    }
  }, [token, mutate])

  const home = status === 'authenticated' ? '/trips' : '/'
  const homeLabel = status === 'authenticated' ? 'Về trang chuyến đi' : 'Về trang chủ'

  const authenticated = status === 'authenticated'
  const resendHref = authenticated ? NOTIFICATION_SETTINGS_PATH : loginPath(NOTIFICATION_SETTINGS_PATH)

  let Icon: LucideIcon = Loader2
  let tone = 'text-muted-foreground'
  let title = 'Đang xác minh email…'
  let message: string | null = 'Chờ một chút nhé.'
  let error: string | null = null
  if (!token) {
    Icon = AlertCircle
    tone = 'text-destructive'
    title = 'Thiếu mã xác minh'
    message = 'Liên kết không đầy đủ. Hãy mở lại đúng link trong email, hoặc gửi lại link mới.'
  } else if (verify.isSuccess) {
    Icon = MailCheck
    tone = 'text-success'
    title = 'Đã xác minh email'
    message = `Từ giờ Trip Planner sẽ gửi thông báo tới ${verify.data.email}.`
  } else if (verify.isError) {
    Icon = MailX
    tone = 'text-destructive'
    title = 'Không xác minh được'
    error = getErrorMessage(verify.error)
    message = 'Bạn có thể gửi lại link xác minh mới trong phần Thông báo của hồ sơ.'
  }
  const failed = !token || verify.isError
  const done = verify.isSuccess || failed

  return (
    <AuthShell>
      <Card className="rounded-overlay">
        <CardContent className="grid justify-items-center gap-4 p-8 text-center">
          <Icon className={cn('size-12', tone, Icon === Loader2 && 'animate-spin')} aria-hidden="true" />
          <div role="status" aria-live="polite" className="grid gap-2">
            <h1 className="text-xl font-bold text-foreground">{title}</h1>
            {error && <p className="text-sm font-medium break-words text-destructive">{error}</p>}
            {message && <p className="text-sm break-words text-muted-foreground">{message}</p>}
          </div>
          {done && (
            <div className="grid w-full gap-2">
              {failed && (
                <Button asChild>
                  <Link to={resendHref}>{authenticated ? 'Gửi lại link xác minh' : 'Đăng nhập để gửi lại link'}</Link>
                </Button>
              )}
              <Button asChild variant="outline">
                <Link to={home}>{homeLabel}</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </AuthShell>
  )
}
