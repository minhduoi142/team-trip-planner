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
            <div className="relative mx-auto flex size-64 sm:size-72 items-center justify-center rounded-[28px] border-4 border-white bg-white p-3 shadow-clay-card-hover ring-1 ring-black/5 transition-transform hover:scale-102">
              {qr ? <img src={qr} alt="Mã VietQR chuyển khoản" className="size-full rounded-2xl" /> : <p className="text-sm font-medium text-muted-foreground">Đang tạo mã…</p>}
            </div>

              <dl className="grid grid-cols-[5.5rem_1fr] gap-x-3 gap-y-2 rounded-[22px] border border-white/80 bg-muted/40 p-4 text-xs sm:text-sm shadow-clay-sunken">
                <dt className="text-muted-foreground font-medium">Số tiền</dt>
                <dd className="text-lg font-bold text-primary">{formatVnd(transfer.amount)}</dd>
                  <dt className="text-muted-foreground font-medium">Ngân hàng</dt>
                  <dd className="font-bold text-foreground">{bank.shortName}</dd>
                  <dt className="text-muted-foreground font-medium">Số TK</dt>
                  <dd className="flex items-center gap-1.5 font-mono font-bold text-foreground">
                    {bank.accountNo}
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        aria-label="Copy số tài khoản"
                        onClick={() => copy(bank.accountNo)}
                        className="rounded-full border border-white/80 bg-white/90 shadow-clay-badge hover:bg-white active:scale-95"
                      >
                        {copied ? <Check className="size-3 text-emerald-600 stroke-[3]" /> : <Copy className="size-3" />}
                      </Button>
                  </dd>
                  <dt className="text-muted-foreground font-medium">Chủ TK</dt>
                  <dd className="font-bold text-foreground uppercase">{bank.accountName}</dd>
                  <dt className="text-muted-foreground font-medium">Nội dung</dt>
                  <dd className="font-mono text-foreground font-semibold">{content}</dd>
              </dl>
            </>
            ) : (
              <p className="rounded-[22px] border-2 border-amber-300 bg-amber-50/90 p-4 text-sm font-medium text-amber-950 shadow-clay-card">
                {transfer.to.displayName} chưa thêm tài khoản nhận tiền. Nhắn bạn ấy thêm trong <b>Hồ sơ</b>, hoặc trả tiền mặt
                rồi bấm "Tôi đã chuyển".
              </p>
      )}

              <DialogFooter>
                  <Button className="w-full rounded-full shadow-clay-btn-primary font-bold h-11 text-base" onClick={onMarkSent} disabled={pending}>
                    {pending ? 'Đang ghi nhận…' : `Tôi đã chuyển ${formatVnd(transfer.amount)}`}
                  </Button>
              </DialogFooter>
          </div>
          )
}
