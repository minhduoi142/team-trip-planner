import dayjs from 'dayjs'
import { CheckCircle2, Clock, Send } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { FieldError } from '@/components/common/layout'
import { TabErrorState } from '@/components/common/states'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import {
  useNotificationSettings,
  useRemoveNotifyEmail,
  useRequestNotifyEmail,
  useSendTestEmail,
  useUpdateNotificationPrefs,
} from '@/hooks/useNotificationSettings'
import { getErrorMessage, getFieldErrors } from '@/lib/api'
import type { NotificationPrefsRequest, NotificationSettingsResponse } from '@/types/notification'

const CATEGORY_TOGGLES: {
  key: Exclude<keyof NotificationPrefsRequest, 'emailEnabled'>
  label: string
  hint: string
}[] = [
  { key: 'countdownEnabled', label: 'Đếm ngược ngày đi', hint: 'Còn 7, 3, 1 ngày và ngày khởi hành' },
  { key: 'memberEnabled', label: 'Thành viên', hint: 'Có người vào hoặc rời nhóm' },
  { key: 'expenseEnabled', label: 'Chi tiêu', hint: 'Khoản chi và chuyển khoản liên quan đến bạn' },
]

/** Hồ sơ → Thông báo: email nhận thông báo (có xác minh), bật/tắt từng loại, gửi mail thử. */
export function NotificationSection() {
  const settings = useNotificationSettings()

  return (
    <div className="grid gap-4">
      <p className="text-sm text-muted-foreground">
        Nhận email khi chuyến sắp tới ngày đi, có người vào nhóm hoặc có khoản chi mới.
      </p>
      {settings.isPending ? (
        <div className="grid gap-2" aria-busy="true" aria-label="Đang tải">
          <Skeleton className="h-4 w-3/4 rounded-full" />
          <Skeleton className="h-10 w-full rounded-control" />
        </div>
      ) : settings.isError ? (
        <TabErrorState error={settings.error} onRetry={() => settings.refetch()} />
      ) : (
        <SettingsBody settings={settings.data} />
      )}
    </div>
  )
}

function SettingsBody({ settings }: { settings: NotificationSettingsResponse }) {
  const updatePrefs = useUpdateNotificationPrefs()
  const sendTest = useSendTestEmail()

  const prefs: NotificationPrefsRequest = {
    emailEnabled: settings.emailEnabled,
    countdownEnabled: settings.countdownEnabled,
    memberEnabled: settings.memberEnabled,
    expenseEnabled: settings.expenseEnabled,
  }
  const toggle = (key: keyof NotificationPrefsRequest, value: boolean) =>
    updatePrefs.mutate({ ...prefs, [key]: value }, { onError: (e) => toast.error(getErrorMessage(e)) })

  return (
    <div className="grid divide-y divide-border">
      {!settings.mailConfigured && (
        <p className="mb-4 rounded-item bg-warning-soft px-3 py-2 text-sm text-warning-soft-foreground">
          Máy chủ chưa bật gửi email, nên tạm thời chưa có thư nào được gửi đi.
        </p>
      )}

      <div className="pb-4">
        <EmailBlock settings={settings} />
      </div>

      <div className="grid gap-3 py-4">
        <ToggleRow
          id="notify-all"
          label="Nhận email thông báo"
          checked={settings.emailEnabled}
          onChange={(v) => toggle('emailEnabled', v)}
          strong
        />
        <div className={`grid gap-3 pl-1 transition-opacity ${settings.emailEnabled ? '' : 'opacity-50'}`}>
          {CATEGORY_TOGGLES.map((t) => (
            <ToggleRow
              key={t.key}
              id={`notify-${t.key}`}
              label={t.label}
              hint={t.hint}
              checked={settings[t.key]}
              disabled={!settings.emailEnabled}
              onChange={(v) => toggle(t.key, v)}
            />
          ))}
        </div>
      </div>

      <div className="pt-4">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!settings.notifyEmail || !settings.mailConfigured || sendTest.isPending}
          onClick={() =>
            sendTest.mutate(undefined, {
              onSuccess: () => toast.success(`Đã gửi mail thử tới ${settings.notifyEmail}`),
              onError: (e) => toast.error(getErrorMessage(e)),
            })
          }
        >
          <Send />
          {sendTest.isPending ? 'Đang gửi…' : 'Gửi mail thử'}
        </Button>
      </div>
    </div>
  )
}

function EmailBlock({ settings }: { settings: NotificationSettingsResponse }) {
  const request = useRequestNotifyEmail()
  const remove = useRemoveNotifyEmail()
  const [editing, setEditing] = useState(false)
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string>()
  const [confirmRemove, setConfirmRemove] = useState(false)

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const value = email.trim()
    if (!value) {
      setError('Nhập email')
      return
    }
    setError(undefined)
    request.mutate(value, {
      onSuccess: (next) => {
        setEditing(false)
        setEmail('')
        toast.success(
          next.notifyEmail === value.toLowerCase() && !next.pendingEmail
            ? 'Đã đặt email nhận thông báo'
            : `Đã gửi link xác minh tới ${value}`,
        )
      },
      onError: (e) => {
        const fieldError = getFieldErrors(e).email
        if (fieldError) setError(fieldError)
        else toast.error(getErrorMessage(e))
      },
    })
  }

  const resend = (address: string) =>
    request.mutate(address, {
      onSuccess: () => toast.success(`Đã gửi lại link xác minh tới ${address}`),
      onError: (e) => toast.error(getErrorMessage(e)),
    })

  const showForm = editing || (!settings.notifyEmail && !settings.pendingEmail)

  return (
    <div className="grid gap-2.5">
      {settings.notifyEmail && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <p className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="size-4 shrink-0 text-success" />
            <span className="min-w-0 truncate">
              Nhận thư tại <b className="text-foreground">{settings.notifyEmail}</b>
            </span>
          </p>
          {!editing && (
            <div className="flex gap-1">
              <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(true)}>
                Đổi
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-destructive hover:bg-destructive/10"
                disabled={remove.isPending}
                onClick={() => setConfirmRemove(true)}
              >
                Gỡ
              </Button>
            </div>
          )}
        </div>
      )}

      {settings.pendingEmail && (
        <div className="grid gap-1.5 rounded-item bg-muted/60 px-3 py-2.5 text-sm">
          <p className="flex items-start gap-2 text-muted-foreground">
            <Clock className="mt-0.5 size-4 shrink-0 text-primary-strong" />
            <span className="min-w-0 break-words">
              Đã gửi link xác minh tới <b className="text-foreground">{settings.pendingEmail}</b>
              {settings.pendingExpiresAt && <> (hết hạn {dayjs(settings.pendingExpiresAt).format('HH:mm DD/MM')})</>}.
              Mở hộp thư để xác nhận nhé.
            </span>
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="justify-self-start"
            disabled={request.isPending || !settings.mailConfigured}
            onClick={() => resend(settings.pendingEmail as string)}
          >
            Gửi lại link
          </Button>
        </div>
      )}

      {showForm ? (
        <form onSubmit={submit} className="grid gap-1.5" noValidate>
          <Label htmlFor="notify-email">{settings.notifyEmail ? 'Email mới' : 'Email nhận thông báo'}</Label>
          <div className="flex gap-2">
            <Input
              id="notify-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="ban@gmail.com"
              maxLength={254}
              value={email}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? 'notify-email-error' : 'notify-email-hint'}
              onChange={(e) => setEmail(e.target.value)}
              className="min-w-0 flex-1"
            />
            <Button type="submit" size="sm" disabled={request.isPending} className="shrink-0">
              {request.isPending ? 'Đang gửi…' : 'Xác minh'}
            </Button>
          </div>
          {error && <FieldError id="notify-email-error">{error}</FieldError>}
          <div className="flex items-center justify-between gap-2">
            <p id="notify-email-hint" className="text-xs text-muted-foreground">
              Chúng tôi sẽ gửi 1 link để xác nhận đây là hộp thư của bạn.
            </p>
            {editing && (
              <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(false)}>
                Huỷ
              </Button>
            )}
          </div>
        </form>
      ) : (
        !settings.notifyEmail &&
        settings.pendingEmail && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="justify-self-start"
            onClick={() => setEditing(true)}
          >
            Dùng email khác
          </Button>
        )
      )}

      <ConfirmDialog
        open={confirmRemove}
        onOpenChange={setConfirmRemove}
        title="Gỡ email nhận thông báo?"
        description={`Bạn sẽ không nhận email thông báo nào nữa${settings.notifyEmail ? ` tại ${settings.notifyEmail}` : ''} cho tới khi xác minh lại một email.`}
        confirmLabel="Gỡ email"
        destructive
        pending={remove.isPending}
        onConfirm={() =>
          remove.mutate(undefined, {
            onSuccess: () => {
              setConfirmRemove(false)
              toast.success('Đã gỡ email nhận thông báo')
            },
            onError: (e) => toast.error(getErrorMessage(e)),
          })
        }
      />
    </div>
  )
}

interface ToggleRowProps {
  id: string
  label: string
  hint?: string
  checked: boolean
  disabled?: boolean
  strong?: boolean
  onChange: (value: boolean) => void
}

function ToggleRow({ id, label, hint, checked, disabled, strong, onChange }: ToggleRowProps) {
  return (
    <div className="flex items-center justify-between gap-3">
      <Label htmlFor={id} className="grid gap-0.5 font-normal">
        <span className={strong ? 'text-sm font-semibold text-foreground' : 'text-sm text-foreground'}>{label}</span>
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </Label>
      <Switch id={id} checked={checked} disabled={disabled} onCheckedChange={onChange} />
    </div>
  )
}
