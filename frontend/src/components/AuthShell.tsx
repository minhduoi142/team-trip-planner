import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { BrandLogo } from './BrandLogo'
import { FloatingBackground } from '@/components/ui/FloatingBackground'

/**
 * Khung cho trang đăng nhập / đăng ký / tham gia: logo + thẻ ở giữa (nền video là TripBackground ở App).
 * Các trang dùng `<Card className="rounded-overlay">` mặc định, không tự chế kiểu card riêng.
 * Hình trang trí chỉ ở các góc trên (density "corners") để không lộ sau ô nhập trên mobile.
 */
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-svh flex-col items-center justify-center overflow-x-clip px-4 py-10">
      <FloatingBackground density="corners" />
      <div className="relative z-10 w-full max-w-sm">
        <div className="mb-6 flex justify-center">
          <Link to="/" aria-label="Về trang giới thiệu" className="rounded-item">
            <BrandLogo />
          </Link>
        </div>
        {children}
      </div>
    </div>
  )
}
