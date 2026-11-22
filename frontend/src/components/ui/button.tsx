import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Slot } from "radix-ui"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-full border border-transparent bg-clip-padding text-sm font-semibold whitespace-nowrap transition-all duration-200 ease-[cubic-bezier(0.34,1.56,0.64,1)] outline-none select-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-1 active:not-aria-[haspopup]:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none aria-invalid:border-destructive aria-invalid:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-clay-btn-primary hover:-translate-y-0.5 hover:shadow-clay-btn-primary active:not-aria-[haspopup]:shadow-clay-pressed",
        outline:
          "border-2 border-border/80 bg-card text-foreground shadow-clay-btn-outline hover:-translate-y-0.5 hover:bg-muted/40 hover:text-foreground active:not-aria-[haspopup]:shadow-clay-pressed",
        secondary:
          "bg-secondary text-secondary-foreground shadow-clay-btn-secondary hover:-translate-y-0.5 hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)] active:not-aria-[haspopup]:shadow-clay-pressed",
        ghost:
          "hover:bg-muted/70 hover:text-foreground active:not-aria-[haspopup]:translate-y-0.5 active:not-aria-[haspopup]:scale-[0.97]",
        destructive:
          "bg-destructive text-white shadow-clay-btn-primary hover:-translate-y-0.5 hover:bg-destructive/90 active:not-aria-[haspopup]:shadow-clay-pressed focus-visible:border-destructive/40 focus-visible:ring-destructive/20",
        link: "text-primary underline-offset-4 hover:underline active:not-aria-[haspopup]:translate-y-0",
      },
      size: {
        default:
          "h-10 gap-2 px-4 has-data-[icon=inline-end]:pr-3.5 has-data-[icon=inline-start]:pl-3.5",
        xs: "h-7 gap-1 px-3 text-xs has-data-[icon=inline-end]:pr-2.5 has-data-[icon=inline-start]:pl-2.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8.5 gap-1.5 px-3.5 text-xs has-data-[icon=inline-end]:pr-2.5 has-data-[icon=inline-start]:pl-2.5",
        lg: "h-12 gap-2 px-6 text-base has-data-[icon=inline-end]:pr-4 has-data-[icon=inline-start]:pl-4",
        icon: "size-10",
        "icon-xs": "size-7 [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8.5",
        "icon-lg": "size-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

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
