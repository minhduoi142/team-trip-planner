import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useUpdateProfile } from '@/hooks/useAuthMutations'
import { getErrorMessage, getFieldErrors } from '@/lib/api'
import type { UserResponse } from '@/types/auth'
import { BankAccountSection } from './BankAccountSection'
import { FormField } from './FormField'
import { ImageUploadButton } from './ImageUploadButton'
import { UserAvatar } from './UserAvatar'

interface ProfileDialogProps {
  user: UserResponse
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ProfileDialog({ user, open, onOpenChange }: ProfileDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92svh] overflow-y-auto sm:max-w-md">
        {open && (
          <>
            <ProfileForm user={user} onDone={() => onOpenChange(false)} />
            {/* Form riêng (không lồng trong form hồ sơ) */}
            <BankAccountSection user={user} />
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

function ProfileForm({ user, onDone }: { user: UserResponse; onDone: () => void }) {
  const [displayName, setDisplayName] = useState(user.displayName)
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl ?? '')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const update = useUpdateProfile()

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!displayName.trim()) {
      setErrors({ displayName: 'Tên hiển thị không được để trống' })
      return
    }
    update.mutate(
      { displayName: displayName.trim(), avatarUrl: avatarUrl.trim() || null },
      {
        onSuccess: () => {
          toast.success('Đã cập nhật hồ sơ')
          onDone()
        },
        onError: (error) => {
          const fieldErrors = getFieldErrors(error)
          setErrors(fieldErrors)
          if (Object.keys(fieldErrors).length === 0) toast.error(getErrorMessage(error))
        },
      },
    )
  }

  return (
    <form onSubmit={submit} className="grid gap-5" noValidate>
      <DialogHeader>
        <DialogTitle>Hồ sơ của bạn</DialogTitle>
        <DialogDescription>Tên và ảnh này sẽ hiện với cả nhóm.</DialogDescription>
      </DialogHeader>

      <div className="flex flex-col items-center gap-3">
        <UserAvatar userId={user.id} name={displayName || '?'} avatarUrl={avatarUrl || null} className="size-20 text-2xl" />
        <ImageUploadButton purpose="AVATAR" label="Đổi ảnh đại diện" size="sm" onUploaded={setAvatarUrl} />
      </div>

      <FormField id="displayName" label="Tên hiển thị" error={errors.displayName}>
        <Input
          id="displayName"
          maxLength={100}
          value={displayName}
          aria-invalid={Boolean(errors.displayName)}
          onChange={(e) => setDisplayName(e.target.value)}
        />
      </FormField>
      <FormField id="avatarUrl" label="Link ảnh đại diện" optional error={errors.avatarUrl}>
        <Input
          id="avatarUrl"
          inputMode="url"
          placeholder="https://…"
          value={avatarUrl}
          aria-invalid={Boolean(errors.avatarUrl)}
          onChange={(e) => setAvatarUrl(e.target.value)}
        />
      </FormField>

      <p className="text-sm text-muted-foreground">
        Đăng nhập bằng: {[user.hasPassword && `tài khoản ${user.username}`, user.hasGoogle && 'Google'].filter(Boolean).join(' và ')}
      </p>

      <DialogFooter>
        <Button type="submit" disabled={update.isPending}>
          {update.isPending ? 'Đang lưu…' : 'Lưu'}
        </Button>
      </DialogFooter>
    </form>
  )
}
