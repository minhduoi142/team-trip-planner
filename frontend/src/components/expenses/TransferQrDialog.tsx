import { Check, Copy } from 'lucide-react'
import QRCode from 'qrcode'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { formatVnd } from '@/lib/tripContent'
import { buildVietQrPayload, toTransferContent } from '@/lib/vietqr'
import type { MemberBalanceResponse } from '@/types/expense'

export interface QrTransfer {
  amount: number
  to: MemberBalanceResponse
  fromName: string
}

interface TransferQrDialogProps {
  transfer: QrTransfer | null
  tripTitle: string
  pending: boolean
  onOpenChange: (open: boolean) => void
  onMarkSent: () => void
}

/** QR VietQR tạo NGAY TRÊN TRÌNH DUYỆT (không gửi STK ra dịch vụ ngoài). */
export function TransferQrDialog({ transfer, tripTitle, pending, onOpenChange, onMarkSent }: TransferQrDialogProps) {
  return (
    <Dialog open={transfer !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        {transfer && <QrContent transfer={transfer} tripTitle={tripTitle} pending={pending} onMarkSent={onMarkSent} />}
      </DialogContent>
    </Dialog>
  )
}

function QrContent({
  transfer,
  tripTitle,
  pending,
  onMarkSent,
}: {
  transfer: QrTransfer
  tripTitle: string
  pending: boolean
  onMarkSent: () => void
}) {
  const bank = transfer.to.bank
  const content = toTransferContent(`${tripTitle} ${transfer.fromName}`)
  const [qr, setQr] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!bank) return
    let cancelled = false
    const payload = buildVietQrPayload({ bin: bank.bin, accountNo: bank.accountNo, amount: transfer.amount, content })
    QRCode.toDataURL(payload, { errorCorrectionLevel: 'M', margin: 1, width: 320 })
      .then((url) => {
        if (!cancelled) setQr(url)
      })
      .catch(() => toast.error('Không tạo được mã QR'))
    return () => {
      cancelled = true
    }
  }, [bank, transfer.amount, content])

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      toast.error('Không copy được')
    }
  }

  return (
    <div className="grid gap-4">
      <DialogHeader>
        <DialogTitle>Chuyển cho {transfer.to.displayName}</DialogTitle>
        <DialogDescription>Mở app ngân hàng → Quét QR. Số tiền và nội dung đã điền sẵn.</DialogDescription>
      </DialogHeader>

      {bank ? (
        <>
          <div className="mx-auto flex size-64 items-center justify-center rounded-2xl bg-white p-2 ring-1 ring-border">
            {qr ? <img src={qr} alt="Mã VietQR chuyển khoản" className="size-full" /> : <p className="text-sm">Đang tạo mã…</p>}
          </div>
          <dl className="grid grid-cols-[6rem_1fr] gap-x-3 gap-y-1.5 text-sm">
            <dt className="text-muted-foreground">Số tiền</dt>
            <dd className="text-lg font-bold text-primary">{formatVnd(transfer.amount)}</dd>
            <dt className="text-muted-foreground">Ngân hàng</dt>
            <dd className="font-medium">{bank.shortName}</dd>
            <dt className="text-muted-foreground">Số TK</dt>
            <dd className="flex items-center gap-1 font-mono font-medium">
              {bank.accountNo}
              <Button variant="ghost" size="icon-xs" aria-label="Copy số tài khoản" onClick={() => copy(bank.accountNo)}>
                {copied ? <Check /> : <Copy />}
              </Button>
            </dd>
            <dt className="text-muted-foreground">Chủ TK</dt>
            <dd className="font-medium">{bank.accountName}</dd>
            <dt className="text-muted-foreground">Nội dung</dt>
            <dd className="font-mono">{content}</dd>
          </dl>
        </>
      ) : (
        <p className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">
          {transfer.to.displayName} chưa thêm tài khoản nhận tiền. Nhắn bạn ấy thêm trong <b>Hồ sơ</b>, hoặc trả tiền mặt
          rồi bấm "Tôi đã chuyển".
        </p>
      )}

      <DialogFooter>
        <Button className="w-full" onClick={onMarkSent} disabled={pending}>
          {pending ? 'Đang ghi nhận…' : `Tôi đã chuyển ${formatVnd(transfer.amount)}`}
        </Button>
      </DialogFooter>
    </div>
  )
}
