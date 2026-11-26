import { Toaster as Sonner, type ToasterProps } from 'sonner'
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from 'lucide-react'

/** App chỉ có giao diện sáng (docs/ui-slop-audit.md P0-04): toast không theo theme hệ điều hành. */
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={
        {
          '--normal-bg': 'var(--popover)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--border)',
          '--success-bg': 'var(--success-soft)',
          '--success-text': 'var(--success-soft-foreground)',
          '--success-border': 'color-mix(in oklch, var(--success) 30%, transparent)',
          '--info-bg': 'var(--info-soft)',
          '--info-text': 'var(--info-soft-foreground)',
          '--info-border': 'color-mix(in oklch, var(--info) 30%, transparent)',
          '--warning-bg': 'var(--warning-soft)',
          '--warning-text': 'var(--warning-soft-foreground)',
          '--warning-border': 'color-mix(in oklch, var(--warning) 30%, transparent)',
          '--error-bg': 'color-mix(in oklch, var(--destructive) 8%, var(--card))',
          '--error-text': 'var(--destructive)',
          '--error-border': 'color-mix(in oklch, var(--destructive) 30%, transparent)',
          '--border-radius': 'var(--radius-item)',
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: 'cn-toast',
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
