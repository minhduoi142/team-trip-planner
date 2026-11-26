import { MoreVertical } from 'lucide-react'
import type { ComponentProps, ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/** Khung nội dung dùng chung cho header, main, footer ở mọi layout (docs/ui-slop-audit.md P1-46, P2-03). */
export function PageContainer({ className, asMain = false, ...props }: ComponentProps<'div'> & { asMain?: boolean }) {
  const Tag = asMain ? 'main' : 'div'
  return <Tag className={cn('mx-auto w-full max-w-5xl px-4 sm:px-6', className)} {...props} />
}

/** Dòng lỗi dưới một control không nằm trong FormField (P1-46): cùng kiểu chữ với FormField. */
export function FieldError({ id, children }: { id?: string; children: ReactNode }) {
  if (!children) return null
  return (
    <p id={id} role="alert" className="text-sm text-destructive">
      {children}
    </p>
  )
}

/**
 * Nút ⋮ của một dòng (P1-45): ghost, hiển thị 34px nhưng vùng chạm 50px, không bóng.
 * `label` phải nêu tên đối tượng, vd "Tùy chọn cho Áo mưa".
 */
export function RowMenuButton({ label, className, ...props }: ComponentProps<typeof Button> & { label: string }) {
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label={label}
      className={cn('shrink-0 rounded-full text-muted-foreground hover:text-foreground', className)}
      {...props}
    >
      <MoreVertical />
    </Button>
  )
}
