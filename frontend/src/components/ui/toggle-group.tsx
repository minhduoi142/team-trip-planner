import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { ToggleGroup as ToggleGroupPrimitive } from 'radix-ui'
import { cn } from '@/lib/utils'

/**
 * Viên chọn dùng chung (docs/ui-slop-audit.md P1-40): thay cho các nút `role="radio"` tự chế dùng gradient rose.
 * Radix ToggleGroup lo roving tabindex + phím mũi tên. Trạng thái chọn = nền primary-strong + dấu hiệu ngoài màu do nơi gọi thêm nếu cần.
 */
const toggleItemVariants = cva(
  'relative inline-flex min-h-10 shrink-0 items-center justify-center gap-1.5 rounded-full border border-border bg-card px-3.5 text-sm font-semibold whitespace-nowrap text-foreground transition-colors duration-150 outline-none select-none hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 data-[state=on]:border-transparent data-[state=on]:bg-primary-strong data-[state=on]:text-primary-strong-foreground data-[state=on]:shadow-flat [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*="size-"])]:size-4',
  {
    variants: {
      size: {
        default: 'min-h-10 px-3.5',
        sm: 'touch-target min-h-8.5 px-3 text-xs',
      },
    },
    defaultVariants: { size: 'default' },
  },
)

type ToggleGroupProps = React.ComponentProps<typeof ToggleGroupPrimitive.Root>

function ToggleGroup({ className, ...props }: ToggleGroupProps) {
  return (
    <ToggleGroupPrimitive.Root
      data-slot="toggle-group"
      className={cn('flex flex-wrap items-center gap-2', className)}
      {...props}
    />
  )
}

function ToggleGroupItem({
  className,
  size,
  ...props
}: React.ComponentProps<typeof ToggleGroupPrimitive.Item> & VariantProps<typeof toggleItemVariants>) {
  return (
    <ToggleGroupPrimitive.Item
      data-slot="toggle-group-item"
      className={cn(toggleItemVariants({ size }), className)}
      {...props}
    />
  )
}

export { ToggleGroup, ToggleGroupItem, toggleItemVariants }
