import { Check, Copy, Info, RefreshCw, Share2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useRegenerateInviteCode } from '@/hooks/useTrips'
import { getErrorMessage } from '@/lib/api'
import { SHARE_BASE_URL } from '@/lib/config'
import { ConfirmDialog } from './ConfirmDialog'

interface InviteShareProps {
  tripId: number
  tripTitle: string
  inviteCode: string
  canRegenerate: boolean
}

export function InviteShare({ tripId, tripTitle, inviteCode, canRegenerate }: InviteShareProps) {
  const [copied, setCopied] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const regenerate = useRegenerateInviteCode(tripId)
  // Link /share/{code} do backend phục vụ: có ảnh + tiêu đề xem trước khi dán vào Zalo/Messenger
  const link = `${SHARE_BASE_URL}/share/${inviteCode}`
  const canShare = typeof navigator.share === 'function'

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      toast.success('Đã copy link mời')
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Không copy được, hãy chọn và copy link thủ công')
    }
  }

  const share = async () => {
    try {
      await navigator.share({
        title: tripTitle,
        text: `Vào nhóm "${tripTitle}" trên Trip Planner nha! Mã mời: ${inviteCode}`,
        url: link,
      })
    } catch {
      /* người dùng hủy chia sẻ */
    }
  }

  const doRegenerate = () =>
    regenerate.mutate(undefined, {
      onSuccess: () => {
        setConfirmOpen(false)
        toast.success('Đã tạo mã mời mới, link cũ không dùng được nữa')
      },
      onError: (error) => toast.error(getErrorMessage(error)),
    })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mời bạn bè</CardTitle>
        <CardDescription>Gửi link này cho bạn bè để cùng lên kế hoạch</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 rounded-full border border-border/80 bg-input/20 py-1.5 pr-1.5 pl-3.5 shadow-sunken">
          <input
            readOnly
            value={link}
            className="min-w-0 flex-1 bg-transparent text-sm font-medium text-foreground outline-none select-all"
            onFocus={(e) => e.target.select()}
            aria-label="Link mời tham gia"
          />
          <Button
            type="button"
            onClick={copy}
            className="shrink-0 rounded-full"
            aria-label={copied ? 'Đã copy' : 'Copy link'}
          >
            {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
            {copied ? 'Đã chép' : 'Chép'}
          </Button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground">Mã mời:</span>
            <span className="rounded-full bg-primary/10 px-3 py-1 font-mono text-sm font-bold tracking-wider text-primary-strong border border-primary/20">
              {inviteCode}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {canShare && (
              <Button type="button" variant="outline" size="sm" onClick={share}>
                <Share2 className="size-3.5" />
                Chia sẻ
              </Button>
            )}

            {canRegenerate && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-foreground"
                onClick={() => setConfirmOpen(true)}
              >
                <RefreshCw className="size-3.5" />
                Đổi mã
              </Button>
            )}
          </div>
        </div>

        <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
          <Info className="mt-px size-3.5 shrink-0" />
          Link có sẵn ảnh bìa và thông tin khi dán vào Zalo/Messenger.
        </p>
      </CardContent>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Đổi mã mời mới?"
        description="Mã mời và link cũ sẽ không dùng được nữa. Người đã vào nhóm không bị ảnh hưởng."
        confirmLabel="Đổi mã"
        destructive
        pending={regenerate.isPending}
        onConfirm={doRegenerate}
      />
    </Card>
  )
}
