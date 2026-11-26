import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import { Slot } from 'radix-ui'

const badgeVariants = cva(
  'group/badge inline-flex h-6 w-fit shrink-0 items-center justify-center gap-1.5 overflow-hidden rounded-full border border-transparent px-3 py-0.5 text-xs font-semibold whitespace-nowrap transition-colors duration-150 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 aria-invalid:border-destructive aria-invalid:ring-destructive/20 [&>svg]:pointer-events-none [&>svg]:size-3!',
  {
    variants: {
      variant: {
        default: 'bg-primary-strong text-primary-strong-foreground [a]:hover:bg-primary-strong/90',
        secondary: 'bg-secondary text-secondary-foreground [a]:hover:bg-secondary/90',
        destructive: 'bg-destructive/15 text-destructive border border-destructive/25 [a]:hover:bg-destructive/25',
        outline: 'border-border bg-card text-foreground [a]:hover:bg-muted',
        ghost: 'hover:bg-muted hover:text-muted-foreground',
        link: 'text-primary-strong underline-offset-4 hover:underline',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

function Badge({
  className,
  variant = 'default',
  asChild = false,
  ...props
}: React.ComponentProps<'span'> & VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : 'span'

  return (
    <Comp data-slot="badge" data-variant={variant} className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
