import { GoogleLogin } from '@react-oauth/google'
import { toast } from 'sonner'
import { useGoogleLogin } from '@/hooks/useAuthMutations'
import { getErrorMessage } from '@/lib/api'
import { googleLoginEnabled } from '@/lib/config'

/** Nút Google Identity Services: lấy ID token rồi gửi lên backend để đổi lấy JWT của hệ thống. */
export function GoogleLoginButton() {
  const login = useGoogleLogin()

  if (!googleLoginEnabled) return null

  return (
    <div className="flex justify-center" aria-busy={login.isPending}>
      <GoogleLogin
        shape="pill"
        size="large"
        text="continue_with"
        width="320"
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
    </div>
  )
}
