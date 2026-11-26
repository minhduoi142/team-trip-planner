import { GoogleLogin } from '@react-oauth/google'
import { Loader2 } from 'lucide-react'
import { useLayoutEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { useGoogleLogin } from '@/hooks/useAuthMutations'
import { getErrorMessage } from '@/lib/api'
import { googleLoginEnabled } from '@/lib/config'

/** Google Identity Services nhận độ rộng nút 200–400px và không tự co theo khung. */
const MIN_WIDTH = 200
const MAX_WIDTH = 320

/** Nút Google Identity Services: lấy ID token rồi gửi lên backend để đổi lấy JWT của hệ thống. */
export function GoogleLoginButton() {
  const login = useGoogleLogin()
  const boxRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState<number | null>(null)

  // Đo khung chứa để nút không tràn card ở màn 360px (trước đây cố định 320px)
  useLayoutEffect(() => {
    const box = boxRef.current
    if (!box) return
    const measure = () => {
      const next = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, Math.floor(box.clientWidth)))
      setWidth((prev) => (prev === next ? prev : next))
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(box)
    return () => observer.disconnect()
  }, [])

  if (!googleLoginEnabled) return null

  return (
    <div ref={boxRef} className="relative flex min-h-11 w-full justify-center" aria-busy={login.isPending}>
      {width !== null && (
        <GoogleLogin
          key={width}
          shape="pill"
          size="large"
          text="continue_with"
          width={String(width)}
          onSuccess={(credential) => {
            if (!credential.credential) {
              toast.error('Không nhận được thông tin đăng nhập từ Google')
              return
            }
            login.mutate(credential.credential, { onError: (error) => toast.error(getErrorMessage(error)) })
          }}
          onError={() => {
            toast.error('Đăng nhập Google thất bại, thử lại nhé')
          }}
        />
      )}
      {login.isPending && (
        <div
          role="status"
          className="absolute inset-0 flex items-center justify-center gap-2 rounded-control bg-card/90 text-sm font-medium"
        >
          <Loader2 className="size-4 animate-spin" />
          Đang đăng nhập với Google…
        </div>
      )}
    </div>
  )
}
