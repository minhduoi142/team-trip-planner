import { useEffect, useRef } from 'react'
import { Link, useSearchParams } from 'react-router'
import { useAuth } from '@/auth/useAuth'
import { AuthShell } from '@/components/AuthShell'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useVerifyEmail } from '@/hooks/useNotificationSettings'
import { getErrorMessage } from '@/lib/api'

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

  let emoji = '⏳'
  let title = 'Đang xác minh email…'
  let message = 'Chờ một chút nhé.'
  if (!token) {
    emoji = '🥲'
    title = 'Thiếu mã xác minh'
    message = 'Liên kết không đầy đủ. Hãy mở lại đúng link trong email.'
  } else if (verify.isSuccess) {
    emoji = '🎉'
    title = 'Đã xác minh email'
    message = `Từ giờ Trip Planner sẽ gửi thông báo tới ${verify.data.email}.`
  } else if (verify.isError) {
    emoji = '🥲'
    title = 'Không xác minh được'
    message = `${getErrorMessage(verify.error)}. Vào Hồ sơ → Thông báo để gửi lại link mới.`
  }

  return (
    <AuthShell>
      <Card className="rounded-[32px] border-2 border-white/80 bg-card/95 shadow-clay-card">
        <CardContent className="space-y-4 p-8 text-center">
          <p className="text-5xl">{emoji}</p>
          <h1 className="text-xl font-bold text-foreground">{title}</h1>
          <p className="text-sm font-medium break-words text-muted-foreground">{message}</p>
          {(verify.isSuccess || verify.isError || !token) && (
            <Button asChild variant="outline" className="rounded-full shadow-clay-card">
              <Link to={home}>{homeLabel}</Link>
            </Button>
          )}
        </CardContent>
      </Card>
    </AuthShell>
  )
}
