import { GoogleLogin } from '@react-oauth/google'
import { CheckCircle2, Unlink } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { useLinkGoogle, useUnlinkGoogle } from '@/hooks/useAuthMutations'
import { getErrorMessage } from '@/lib/api'
import { googleLoginEnabled } from '@/lib/config'
import type { UserResponse } from '@/types/auth'

/**
 * Liên kết Google trong hồ sơ: tài khoản tạo bằng username/mật khẩu gắn Google vào để lần sau
 * "Tiếp tục với Google" vào đúng tài khoản này (không tạo tài khoản mới).
 */
export function GoogleLinkSection({ user }: { user: UserResponse }) {
  const link = useLinkGoogle()
  const unlink = useUnlinkGoogle()
  const [confirmUnlink, setConfirmUnlink] = useState(false)

  if (!googleLoginEnabled) return null
  const onError = (error: unknown) => toast.error(getErrorMessage(error))

  return (
    <section className="grid gap-3 py-4">
      <h3 className="text-sm font-semibold">Đăng nhập bằng Google</h3>

      {user.hasGoogle ? (
        <>
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="size-4 shrink-0 text-success" />
            <span className="min-w-0 truncate">Đã liên kết{user.email ? ` với ${user.email}` : ''}</span>
          </p>
          {user.hasPassword ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="justify-self-start text-destructive hover:bg-destructive/10"
              disabled={unlink.isPending}
              onClick={() => setConfirmUnlink(true)}
            >
              <Unlink />
              Hủy liên kết
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground">Tài khoản này chỉ đăng nhập bằng Google.</p>
          )}
        </>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            Liên kết để lần sau bấm "Tiếp tục với Google" là vào đúng tài khoản <b>{user.username}</b> này.
          </p>
          <div className="flex justify-center" aria-busy={link.isPending}>
            <GoogleLogin
              shape="pill"
              text="continue_with"
              width="280"
              onSuccess={(credential) => {
                if (!credential.credential) {
                  toast.error('Không nhận được thông tin từ Google')
                  return
                }
                link.mutate(credential.credential, {
                  onSuccess: () => toast.success('Đã liên kết Google'),
                  onError,
                })
              }}
              onError={() => toast.error('Liên kết Google thất bại, hãy thử lại')}
            />
          </div>
        </>
      )}

      <ConfirmDialog
        open={confirmUnlink}
        onOpenChange={setConfirmUnlink}
        title="Hủy liên kết Google?"
        description={`Lần sau bạn phải đăng nhập bằng tài khoản ${user.username} và mật khẩu. "Tiếp tục với Google" sẽ không vào tài khoản này nữa.`}
        confirmLabel="Hủy liên kết"
        destructive
        pending={unlink.isPending}
        onConfirm={() =>
          unlink.mutate(undefined, {
            onSuccess: () => {
              setConfirmUnlink(false)
              toast.success('Đã hủy liên kết Google')
            },
            onError,
          })
        }
      />
    </section>
  )
}
