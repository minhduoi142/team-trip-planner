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

/** Gõ "Linh Đà Lạt" → "linhdalat": bỏ dấu, chữ thường, bỏ ký tự không hợp lệ (P3-AU-03) */
function normalizeUsername(value: string): string {
  return value
    .replace(/[đĐ]/g, 'd')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9._]/g, '')
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
  const [formError, setFormError] = useState<string | null>(null)
  const register = useRegister()
  const returnTo = params.get('returnTo')
  const loginHref = returnTo ? `/login?returnTo=${encodeURIComponent(returnTo)}` : '/login'

  const set = (key: keyof FormState, value: string) => setForm((prev) => ({ ...prev, [key]: value }))

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const clientErrors = validate(form)
    setErrors(clientErrors)
    setFormError(null)
    if (Object.keys(clientErrors).length > 0) return

    register.mutate(
      { displayName: form.displayName.trim(), username: form.username.trim(), password: form.password },
      {
        onSuccess: (auth) => toast.success(`Chào ${auth.user.displayName}!`),
        onError: (error) => {
          if (getErrorCode(error) === 'USERNAME_TAKEN') {
            setErrors({ username: getErrorMessage(error) })
            return
          }
          const fieldErrors = getFieldErrors(error)
          setErrors(fieldErrors)
          if (Object.keys(fieldErrors).length === 0) setFormError(getErrorMessage(error))
        },
      },
    )
  }

  return (
    <AuthShell>
      <Card className="rounded-overlay">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Tạo tài khoản</CardTitle>
          <CardDescription>Tạo tài khoản để cùng nhóm lên kế hoạch chuyến đi</CardDescription>
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
            <FormField
              id="username"
              label="Tên đăng nhập"
              error={errors.username}
              hint="Không dấu, 3–30 ký tự (a-z, 0-9, dấu chấm, gạch dưới)"
            >
              <Input
                id="username"
                autoComplete="username"
                autoCapitalize="none"
                placeholder="VD: linh_dalat"
                value={form.username}
                aria-invalid={Boolean(errors.username)}
                onChange={(e) => set('username', normalizeUsername(e.target.value))}
              />
            </FormField>
            <FormField id="password" label="Mật khẩu" error={errors.password} hint="Ít nhất 8 ký tự">
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
            {formError && (
              <p role="alert" className="text-sm text-destructive">
                {formError}
              </p>
            )}
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
            <Link to={loginHref} className="font-semibold text-primary-strong hover:underline">
              Đăng nhập
            </Link>
          </p>
        </CardContent>
      </Card>
    </AuthShell>
  )
}
