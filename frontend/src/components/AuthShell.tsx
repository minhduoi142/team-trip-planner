import type { ReactNode } from 'react'
import { BrandLogo } from './BrandLogo'
import { FloatingBackground } from '@/components/ui/FloatingBackground'

/** Khung cho trang đăng nhập / đăng ký / tham gia: nền gradient pastel, vật trang trí bay bổng, thẻ ở giữa. */
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-svh flex-col items-center justify-center overflow-hidden bg-background/50 px-4 py-10">
      <FloatingBackground />
      <div className="relative z-10 w-full max-w-sm">
        <div className="mb-6 flex justify-center">
          <BrandLogo />
        </div>
        {children}
      </div>
    </div>
  )
}
