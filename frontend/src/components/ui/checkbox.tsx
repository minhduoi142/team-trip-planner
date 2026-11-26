import * as React from 'react'
import { cn } from '@/lib/utils'
import { Checkbox as CheckboxPrimitive } from 'radix-ui'
import { CheckIcon } from 'lucide-react'

function Checkbox({ className, ...props }: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        'peer relative flex size-5 shrink-0 items-center justify-center rounded-lg border-2 border-border bg-card transition-colors duration-150 outline-none after:absolute after:-inset-3 after:content-[""] focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 data-checked:border-primary data-checked:bg-primary data-checked:text-primary-foreground',
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="grid place-content-center text-current transition-transform duration-150 data-checked:scale-100 scale-0 [&>svg]:size-3.5 [&>svg]:stroke-[3]"
      >
        <CheckIcon />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }
