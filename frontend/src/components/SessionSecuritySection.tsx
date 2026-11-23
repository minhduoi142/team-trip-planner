import { LogOut, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { useAuth } from '@/auth/useAuth'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { getErrorMessage } from '@/lib/api'

/** Hồ sơ → Bảo mật: đăng xuất mọi thiết bị (thu hồi mọi phiên refresh token ở server). */
export function SessionSecuritySection() {
  const { logoutAll } = useAuth()
  const [confirm, setConfirm] = useState(false)
  const [pending, setPending] = useState(false)

  const run = async () => {
    setPending(true)
    try {
      await logoutAll()
      toast.success('Đã đăng xuất khỏi mọi thiết bị')
    } catch (error) {
      toast.error(getErrorMessage(error))
      setPending(false)
    }
  }

  return (
    <div className="grid gap-3 rounded-[24px] border-2 border-white/80 bg-card/90 p-4 shadow-clay-card sm:p-5">
      <p className="flex items-center gap-2 text-sm font-bold text-foreground">
        <ShieldCheck className="size-4 text-primary" />
        Bảo mật
      </p>
      <p className="text-sm text-muted-foreground">
        Lỡ đăng nhập trên máy lạ, hoặc thấy nghi ngờ? Đăng xuất khỏi mọi điện thoại và máy tính đang dùng tài khoản này.
      </p>
      <Button type="button" variant="outline" size="sm" className="justify-self-start" onClick={() => setConfirm(true)}>
        <LogOut />
        Đăng xuất mọi thiết bị
      </Button>
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title="Đăng xuất khỏi mọi thiết bị?"
        description="Mọi nơi đang đăng nhập tài khoản này (kể cả máy này) sẽ phải đăng nhập lại."
        confirmLabel="Đăng xuất tất cả"
        destructive
        pending={pending}
        onConfirm={() => void run()}
      />
    </div>
  )
}
