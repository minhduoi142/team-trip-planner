import { useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { AuthShell } from '@/components/AuthShell'
import { FormField } from '@/components/FormField'
import { GoogleLoginButton } from '@/components/GoogleLoginButton'
import { InviteHint } from '@/components/InviteHint'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useRegister } from '@/hooks/useAuthMutations'
import { getErrorCode, getErrorMessage, getFieldErrors } from '@/lib/api'
import { googleLoginEnabled } from '@/lib/config'

const USERNAME_PATTERN = /^[A-Za-z0-9._]{3,30}$/

interface FormState {
  displayName: string
  username: string
  password: string
  confirmPassword: string
}

function validate(form: FormState): Record<string, string> {
  const errors: Record<string, string> = {}
  if (!form.displayName.trim()) errors.displayName = 'Nhập tên bạn muốn mọi người gọi'
  if (!USERNAME_PATTERN.test(form.username.trim())) {
    errors.username = '3–30 ký tự: chữ không dấu, số, dấu chấm hoặc gạch dưới'
  }
  if (form.password.length < 8 || form.password.length > 72) errors.password = 'Mật khẩu từ 8 đến 72 ký tự'
  if (form.confirmPassword !== form.password) errors.confirmPassword = 'Mật khẩu nhập lại không khớp'
  return errors
}

export function RegisterPage() {
  const [params] = useSearchParams()
  const [form, setForm] = useState<FormState>({ displayName: '', username: '', password: '', confirmPassword: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const register = useRegister()
  const returnTo = params.get('returnTo')
  const loginHref = returnTo ? `/login?returnTo=${encodeURIComponent(returnTo)}` : '/login'

  const set = (key: keyof FormState, value: string) => setForm((prev) => ({ ...prev, [key]: value }))

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const clientErrors = validate(form)
    setErrors(clientErrors)
    if (Object.keys(clientErrors).length > 0) return

    register.mutate(
      { displayName: form.displayName.trim(), username: form.username.trim(), password: form.password },
      {
        onSuccess: (auth) => toast.success(`Chào ${auth.user.displayName}! 🎉`),
        onError: (error) => {
          if (getErrorCode(error) === 'USERNAME_TAKEN') {
            setErrors({ username: getErrorMessage(error) })
            return
          }
          const fieldErrors = getFieldErrors(error)
          setErrors(fieldErrors)
          if (Object.keys(fieldErrors).length === 0) toast.error(getErrorMessage(error))
        },
      },
    )
  }

  return (
    <AuthShell>
        <Card className="rounded-[32px] shadow-clay-card border border-border/60 bg-card/95 backdrop-blur-sm p-1 sm:p-2">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold flex items-center justify-center gap-2">
              <span>Tạo tài khoản</span>
              <span className="animate-pulse-gentle">🎉</span>
            </CardTitle>
            <CardDescription>Chỉ mất vài giây để vào nhóm cùng mọi người</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5">
            <InviteHint returnTo={returnTo} action="Đăng ký" />
            <form onSubmit={submit} className="grid gap-4" noValidate>
              <FormField id="displayName" label="Tên hiển thị" error={errors.displayName}>
                <Input
                  id="displayName"
                  autoComplete="nickname"
                  placeholder="VD: Linh"
                  value={form.displayName}
                  aria-invalid={Boolean(errors.displayName)}
                  onChange={(e) => set('displayName', e.target.value)}
                />
              </FormField>
              <FormField id="username" label="Tên đăng nhập" error={errors.username}>
                <Input
                  id="username"
                  autoComplete="username"
                  autoCapitalize="none"
                  placeholder="VD: linh_dalat"
                  value={form.username}
                  aria-invalid={Boolean(errors.username)}
                  onChange={(e) => set('username', e.target.value)}
                />
              </FormField>
                <FormField id="password" label="Mật khẩu" error={errors.password}>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="new-password"
                    value={form.password}
                    aria-invalid={Boolean(errors.password)}
                    onChange={(e) => set('password', e.target.value)}
                  />
                </FormField>
                <FormField id="confirmPassword" label="Nhập lại mật khẩu" error={errors.confirmPassword}>
                  <Input
                    id="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    value={form.confirmPassword}
                    aria-invalid={Boolean(errors.confirmPassword)}
                    onChange={(e) => set('confirmPassword', e.target.value)}
                  />
                </FormField>
                <Button type="submit" size="lg" className="w-full" disabled={register.isPending}>
                  {register.isPending ? 'Đang tạo tài khoản…' : 'Đăng ký'}
                </Button>
            </form>

            {googleLoginEnabled && (
              <>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground font-medium">
                    <span className="h-px flex-1 bg-border/60" />
                    hoặc tiếp tục với
                    <span className="h-px flex-1 bg-border/60" />
                  </div>
                  <GoogleLoginButton />
                </>
          )}

                <p className="text-center text-sm text-muted-foreground">
                  Đã có tài khoản?{' '}
                    <Link to={loginHref} className="font-semibold text-primary hover:underline">
                      Đăng nhập
                    </Link>
                </p>
              </CardContent>
        </Card>
    </AuthShell>
  )
}
