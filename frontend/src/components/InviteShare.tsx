import { Check, Copy, RefreshCw, Share2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useRegenerateInviteCode } from '@/hooks/useTrips'
import { getErrorMessage } from '@/lib/api'
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
  const link = `${window.location.origin}/join/${inviteCode}`
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
    <Card className="bg-gradient-to-br from-rose-50 to-violet-50">
      <CardHeader>
        <CardTitle>Rủ cả nhóm vào 💌</CardTitle>
        <CardDescription>Gửi link vào nhóm Zalo/Messenger, bấm là vào được ngay.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        <div className="flex items-center justify-between gap-3 rounded-2xl bg-background px-4 py-3 ring-1 ring-border">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">Mã mời</p>
            <p className="font-mono text-xl font-bold tracking-[0.2em]">{inviteCode}</p>
          </div>
          {canRegenerate && (
            <Button
              variant="ghost"
              size="icon"
              aria-label="Tạo mã mời mới"
              title="Tạo mã mời mới"
              onClick={() => setConfirmOpen(true)}
            >
              <RefreshCw />
            </Button>
          )}
        </div>
        <p className="truncate rounded-xl bg-background/70 px-3 py-2 text-sm text-muted-foreground" title={link}>
          {link}
        </p>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" size="lg" onClick={copy} className={canShare ? '' : 'col-span-2'}>
            {copied ? <Check /> : <Copy />}
            {copied ? 'Đã copy' : 'Copy link'}
          </Button>
          {canShare && (
            <Button size="lg" onClick={share}>
              <Share2 />
              Chia sẻ
            </Button>
          )}
        </div>
      </CardContent>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Tạo mã mời mới?"
        description="Link và mã mời hiện tại sẽ không dùng được nữa. Thành viên đã trong nhóm không bị ảnh hưởng."
        confirmLabel="Tạo mã mới"
        pending={regenerate.isPending}
        onConfirm={doRegenerate}
      />
    </Card>
  )
}
