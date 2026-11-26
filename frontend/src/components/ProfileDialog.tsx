import { ChevronDown, Trash2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useUpdateProfile } from '@/hooks/useAuthMutations'
import { getErrorMessage, getFieldErrors } from '@/lib/api'
import type { UserResponse } from '@/types/auth'
import { BankAccountSection } from './BankAccountSection'
import { FieldError } from './common/layout'
import { GoogleLinkSection } from './GoogleLinkSection'
import { NotificationSection } from './NotificationSection'
import { SessionSecuritySection } from './SessionSecuritySection'
import { FormField } from './FormField'
import { ImageUploadButton } from './ImageUploadButton'
import { UserAvatar } from './UserAvatar'
import { PROFILE_SECTION_LABELS, PROFILE_SECTIONS, parseProfileSection, type ProfileSection } from './profile/sections'

interface ProfileDialogProps {
  user: UserResponse
  open: boolean
  section: ProfileSection
  onOpenChange: (open: boolean) => void
  onSectionChange: (section: ProfileSection) => void
}

/**
 * Hồ sơ chia thành 4 tab (P3-PF-01), mỗi tab có nút lưu riêng. Tab đang mở do AppLayout giữ trong `?profile=`.
 */
export function ProfileDialog({ user, open, section, onOpenChange, onSectionChange }: ProfileDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="content-start sm:max-w-md"
        // Esc trong ô tìm ngân hàng chỉ đóng danh sách gợi ý, không đóng cả hộp thoại
        onEscapeKeyDown={(event) => {
          if (event.target instanceof HTMLElement && event.target.closest('[data-bank-search]')) event.preventDefault()
        }}
      >
        <DialogHeader>
          <DialogTitle>Hồ sơ của bạn</DialogTitle>
          <DialogDescription className="sr-only">Hồ sơ, tài khoản nhận tiền, thông báo và bảo mật.</DialogDescription>
        </DialogHeader>
        {open && (
          <Tabs value={section} onValueChange={(v) => onSectionChange(parseProfileSection(v))} className="gap-4">
            <div className="no-scrollbar -mx-1 overflow-x-auto px-1">
              <TabsList className="w-full *:data-[slot=tabs-trigger]:min-h-10 *:data-[slot=tabs-trigger]:px-2.5">
                {PROFILE_SECTIONS.map((s) => (
                  <TabsTrigger key={s} value={s}>
                    {PROFILE_SECTION_LABELS[s]}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
            <TabsContent value="account" forceMount className="data-[state=inactive]:hidden">
              <ProfileForm user={user} />
            </TabsContent>
            <TabsContent value="bank" forceMount className="data-[state=inactive]:hidden">
              <BankAccountSection user={user} />
            </TabsContent>
            <TabsContent value="notifications" forceMount className="data-[state=inactive]:hidden">
              <NotificationSection />
            </TabsContent>
            <TabsContent
              value="security"
              forceMount
              className="grid divide-y divide-border data-[state=inactive]:hidden"
            >
              <SignInMethods user={user} />
              <GoogleLinkSection user={user} />
              <SessionSecuritySection />
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  )
}

function SignInMethods({ user }: { user: UserResponse }) {
  return (
    <section className="grid gap-1 pb-4">
      <h3 className="text-sm font-semibold">Cách đăng nhập</h3>
      <p className="text-sm text-muted-foreground">
        {[user.hasPassword && `Tài khoản ${user.username}`, user.hasGoogle && 'Google'].filter(Boolean).join(' và ')}
      </p>
    </section>
  )
}

function ProfileForm({ user }: { user: UserResponse }) {
  const [displayName, setDisplayName] = useState(user.displayName)
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl ?? '')
  const [showUrl, setShowUrl] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const update = useUpdateProfile()

  const submit = (event: FormEvent) => {
    event.preventDefault()
    setFormError(null)
    if (!displayName.trim()) {
      setErrors({ displayName: 'Tên hiển thị không được để trống' })
      return
    }
    setErrors({})
    update.mutate(
      { displayName: displayName.trim(), avatarUrl: avatarUrl.trim() || null },
      {
        onSuccess: () => toast.success('Đã cập nhật hồ sơ'),
        onError: (error) => {
          const fieldErrors = getFieldErrors(error)
          setErrors(fieldErrors)
          if (fieldErrors.avatarUrl) setShowUrl(true)
          if (Object.keys(fieldErrors).length === 0) setFormError(getErrorMessage(error))
        },
      },
    )
  }

  const urlVisible = showUrl || Boolean(errors.avatarUrl)

  return (
    <form onSubmit={submit} className="grid gap-5" noValidate>
      <p className="text-sm text-muted-foreground">Tên và ảnh này sẽ hiện với cả nhóm.</p>

      <div className="flex flex-col items-center gap-3">
        <UserAvatar
          userId={user.id}
          name={displayName || '?'}
          avatarUrl={avatarUrl || null}
          className="size-20 text-2xl"
        />
        <div className="flex flex-wrap justify-center gap-2">
          <ImageUploadButton purpose="AVATAR" label="Đổi ảnh đại diện" size="sm" onUploaded={setAvatarUrl} />
          {avatarUrl && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-destructive hover:bg-destructive/10"
              onClick={() => setAvatarUrl('')}
            >
              <Trash2 />
              Xóa ảnh
            </Button>
          )}
        </div>
        <Button
          type="button"
          variant="link"
          size="sm"
          aria-expanded={urlVisible}
          aria-controls="avatar-url-field"
          onClick={() => setShowUrl((v) => !v)}
        >
          Dùng link ảnh
          <ChevronDown className={urlVisible ? 'rotate-180' : undefined} />
        </Button>
      </div>

      {urlVisible && (
        <div id="avatar-url-field">
          <FormField id="avatarUrl" label="Link ảnh đại diện" optional error={errors.avatarUrl}>
            <Input
              id="avatarUrl"
              inputMode="url"
              placeholder="https://…"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
            />
          </FormField>
        </div>
      )}

      <FormField id="displayName" label="Tên hiển thị" error={errors.displayName}>
        <Input id="displayName" maxLength={100} value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
      </FormField>

      {formError && <FieldError>{formError}</FieldError>}

      <div className="flex justify-end">
        <Button type="submit" disabled={update.isPending}>
          {update.isPending ? 'Đang lưu…' : 'Lưu hồ sơ'}
        </Button>
      </div>
    </form>
  )
}
