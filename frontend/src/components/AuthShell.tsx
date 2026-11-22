import type { ReactNode } from 'react'
import { BrandLogo } from './BrandLogo'

/** Khung cho trang đăng nhập / đăng ký / tham gia: nền gradient pastel, thẻ ở giữa. */
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-svh flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-rose-100 via-orange-50 to-violet-100 px-4 py-10">
      <div className="pointer-events-none absolute -top-24 -left-24 size-72 rounded-full bg-rose-200/60 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 -bottom-24 size-72 rounded-full bg-violet-200/60 blur-3xl" />
      <div className="relative w-full max-w-sm">
        <div className="mb-6 flex justify-center">
          <BrandLogo />
        </div>
        {children}
      </div>
    </div>
  )
}
