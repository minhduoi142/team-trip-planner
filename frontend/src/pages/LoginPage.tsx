import { useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { AuthShell } from '@/components/AuthShell'
import { FormField } from '@/components/FormField'
import { GoogleLoginButton } from '@/components/GoogleLoginButton'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useLogin } from '@/hooks/useAuthMutations'
import { getErrorMessage, getFieldErrors } from '@/lib/api'
import { googleLoginEnabled } from '@/lib/config'

export function LoginPage() {
  const [params] = useSearchParams()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const login = useLogin()
  const returnTo = params.get('returnTo')
  const registerHref = returnTo ? `/register?returnTo=${encodeURIComponent(returnTo)}` : '/register'

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const clientErrors: Record<string, string> = {}
    if (!username.trim()) clientErrors.username = 'Nhập tên đăng nhập'
    if (!password) clientErrors.password = 'Nhập mật khẩu'
    setErrors(clientErrors)
    if (Object.keys(clientErrors).length > 0) return

    // Thành công: PublicOnlyRoute tự chuyển tới returnTo
    login.mutate(
      { username: username.trim(), password },
      {
        onError: (error) => {
          const fieldErrors = getFieldErrors(error)
          setErrors(fieldErrors)
          if (Object.keys(fieldErrors).length === 0) toast.error(getErrorMessage(error))
        },
      },
    )
  }

  return (
    <AuthShell>
      <Card className="shadow-xl shadow-rose-200/40">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Chào mừng trở lại!</CardTitle>
          <CardDescription>Đăng nhập để cùng nhóm lên kế hoạch chuyến đi</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5">
          <form onSubmit={submit} className="grid gap-4" noValidate>
            <FormField id="username" label="Tên đăng nhập" error={errors.username}>
              <Input
                id="username"
                autoComplete="username"
                autoCapitalize="none"
                value={username}
                aria-invalid={Boolean(errors.username)}
                onChange={(e) => setUsername(e.target.value)}
              />
            </FormField>
            <FormField id="password" label="Mật khẩu" error={errors.password}>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                aria-invalid={Boolean(errors.password)}
                onChange={(e) => setPassword(e.target.value)}
              />
            </FormField>
            <Button type="submit" size="lg" className="w-full" disabled={login.isPending}>
              {login.isPending ? 'Đang đăng nhập…' : 'Đăng nhập'}
            </Button>
          </form>

          {googleLoginEnabled && (
            <>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="h-px flex-1 bg-border" />
                hoặc
                <span className="h-px flex-1 bg-border" />
              </div>
              <GoogleLoginButton />
            </>
          )}

          <p className="text-center text-sm text-muted-foreground">
            Chưa có tài khoản?{' '}
            <Link to={registerHref} className="font-medium text-primary hover:underline">
              Đăng ký ngay
            </Link>
          </p>
        </CardContent>
      </Card>
    </AuthShell>
  )
}
