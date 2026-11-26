import { Loader2 } from 'lucide-react'

export function FullPageSpinner() {
  return (
    <div className="flex min-h-svh items-center justify-center" role="status" aria-label="Đang tải">
      <Loader2 className="size-8 animate-spin text-primary-strong" />
    </div>
  )
}
