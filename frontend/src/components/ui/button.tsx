import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import { Slot } from 'radix-ui'

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-full border border-transparent bg-clip-padding text-sm font-semibold whitespace-nowrap transition-[color,background-color,border-color,box-shadow,transform] duration-150 ease-out outline-none select-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none aria-invalid:border-destructive aria-invalid:ring-[3px] aria-invalid:ring-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          'bg-primary-strong text-primary-strong-foreground shadow-cta hover:-translate-y-0.5 hover:bg-primary-strong/95 active:not-aria-[haspopup]:translate-y-px active:not-aria-[haspopup]:shadow-pressed',
        outline:
          'border-border bg-card text-foreground shadow-flat hover:bg-muted/60 hover:text-foreground active:not-aria-[haspopup]:shadow-pressed',
        secondary:
          'bg-secondary text-secondary-foreground shadow-flat hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)] active:not-aria-[haspopup]:shadow-pressed',
        ghost: 'hover:bg-muted/70 hover:text-foreground',
        destructive:
          'bg-destructive text-destructive-foreground shadow-cta-destructive hover:-translate-y-0.5 hover:bg-destructive/90 active:not-aria-[haspopup]:translate-y-px active:not-aria-[haspopup]:shadow-pressed focus-visible:border-destructive/40 focus-visible:ring-destructive/40',
        link: 'text-primary-strong underline-offset-4 hover:underline active:not-aria-[haspopup]:translate-y-0',
      },
      size: {
        default: 'h-10 gap-2 px-4 has-data-[icon=inline-end]:pr-3.5 has-data-[icon=inline-start]:pl-3.5',
        xs: "relative touch-target h-7 gap-1 px-3 text-xs has-data-[icon=inline-end]:pr-2.5 has-data-[icon=inline-start]:pl-2.5 [&_svg:not([class*='size-'])]:size-3",
        sm: 'relative touch-target h-8.5 gap-1.5 px-3.5 text-xs has-data-[icon=inline-end]:pr-2.5 has-data-[icon=inline-start]:pl-2.5',
        lg: 'h-12 gap-2 px-6 text-base has-data-[icon=inline-end]:pr-4 has-data-[icon=inline-start]:pl-4',
        icon: 'size-10',
        'icon-xs': "relative touch-target size-7 [&_svg:not([class*='size-'])]:size-3",
        'icon-sm': 'relative touch-target size-8.5',
        'icon-lg': 'size-12',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

function Button({
  className,
  variant = 'default',
  size = 'default',
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : 'button'

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
