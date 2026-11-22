import { GoogleLogin } from '@react-oauth/google'
import { CheckCircle2, Unlink } from 'lucide-react'
import { toast } from 'sonner'
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

  if (!googleLoginEnabled) return null
  const onError = (error: unknown) => toast.error(getErrorMessage(error))

  return (
    <div className="grid gap-3 rounded-[24px] border-2 border-white/80 bg-card/90 p-4 shadow-clay-card sm:p-5">
      <p className="text-sm font-bold text-foreground">Đăng nhập bằng Google</p>

      {user.hasGoogle ? (
        <>
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
            <span className="min-w-0 truncate">Đã liên kết{user.email ? ` với ${user.email}` : ''}</span>
          </p>
          {user.hasPassword ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="justify-self-start"
              disabled={unlink.isPending}
              onClick={() =>
                unlink.mutate(undefined, { onSuccess: () => toast.success('Đã hủy liên kết Google'), onError })
              }
            >
              <Unlink />
              Hủy liên kết
            </Button>
          ) : (
            <p className="text-xs text-muted-foreground">Tài khoản này chỉ đăng nhập bằng Google.</p>
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
                  onSuccess: () => toast.success('Đã liên kết Google 🎉'),
                  onError,
                })
              }}
              onError={() => toast.error('Liên kết Google thất bại, thử lại nhé')}
            />
          </div>
        </>
      )}
    </div>
  )
}
