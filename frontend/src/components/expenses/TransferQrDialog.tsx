import { Check, Copy, Download } from 'lucide-react'
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
  /** Nộp quỹ chung cho thủ quỹ (docs/sdd-trip-fund.md) */
  fund?: boolean
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
  const content = toTransferContent(`${transfer.fund ? 'Quy ' : ''}${tripTitle} ${transfer.fromName}`)
  const [qr, setQr] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

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

  const copy = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(key)
      window.setTimeout(() => setCopied((current) => (current === key ? null : current)), 1500)
    } catch {
      toast.error('Không copy được')
    }
  }

  /** P3-CP-15: QR hiện trên chính điện thoại người trả nên cần lưu ảnh để "Quét từ ảnh" trong app ngân hàng. */
  const saveQr = async () => {
    if (!qr) return
    const fileName = `vietqr-${toTransferContent(transfer.to.displayName).replace(/ /g, '-').toLowerCase() || 'chuyen-khoan'}.png`
    try {
      const blob = await (await fetch(qr)).blob()
      const file = new File([blob], fileName, { type: 'image/png' })
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: `QR chuyển cho ${transfer.to.displayName}` })
        return
      }
    } catch (error) {
      // Người dùng đóng bảng chia sẻ: không cần làm gì thêm
      if (error instanceof DOMException && error.name === 'AbortError') return
    }
    const link = document.createElement('a')
    link.href = qr
    link.download = fileName
    link.click()
  }

  const copyButton = (key: string, text: string, label: string) => (
    <Button variant="ghost" size="icon-sm" aria-label={label} onClick={() => copy(key, text)} className="shrink-0">
      {copied === key ? <Check className="text-success" /> : <Copy />}
    </Button>
  )

  return (
    <div className="grid gap-4">
      <DialogHeader>
        <DialogTitle>
          {transfer.fund ? 'Nộp quỹ cho' : 'Chuyển cho'} {transfer.to.displayName}
        </DialogTitle>
        <DialogDescription>
          Lưu ảnh QR rồi mở app ngân hàng → Quét QR → chọn ảnh. Số tiền và nội dung đã điền sẵn.
        </DialogDescription>
      </DialogHeader>

      {bank ? (
        <>
          <div className="mx-auto grid justify-items-center gap-2">
            <div className="flex size-64 items-center justify-center rounded-item border border-border bg-white p-3 sm:size-72">
              {qr ? (
                <img src={qr} alt="Mã VietQR chuyển khoản" className="size-full" />
              ) : (
                <p className="text-sm font-medium text-muted-foreground">Đang tạo mã…</p>
              )}
            </div>
            <Button variant="outline" size="sm" disabled={!qr} onClick={saveQr}>
              <Download />
              Lưu ảnh QR
            </Button>
          </div>

          <dl className="grid grid-cols-[5.5rem_1fr] items-center gap-x-3 gap-y-1 rounded-item border border-border bg-muted/40 p-4 text-sm">
            <dt className="text-muted-foreground">Số tiền</dt>
            <dd className="flex min-w-0 items-center justify-between gap-1.5">
              <span className="text-lg font-bold whitespace-nowrap text-foreground tabular-nums">
                {formatVnd(transfer.amount)}
              </span>
              {copyButton('amount', String(transfer.amount), 'Copy số tiền')}
            </dd>
            <dt className="text-muted-foreground">Ngân hàng</dt>
            <dd className="py-2 font-semibold text-foreground">{bank.shortName}</dd>
            <dt className="text-muted-foreground">Số TK</dt>
            <dd className="flex min-w-0 items-center justify-between gap-1.5">
              <span className="font-mono font-semibold break-all text-foreground">{bank.accountNo}</span>
              {copyButton('account', bank.accountNo, 'Copy số tài khoản')}
            </dd>
            <dt className="text-muted-foreground">Chủ TK</dt>
            <dd className="py-2 font-semibold break-words text-foreground uppercase">{bank.accountName}</dd>
            <dt className="text-muted-foreground">Nội dung</dt>
            <dd className="flex min-w-0 items-center justify-between gap-1.5">
              <span className="font-mono font-semibold break-all text-foreground">{content}</span>
              {copyButton('content', content, 'Copy nội dung chuyển khoản')}
            </dd>
          </dl>
        </>
      ) : (
        <p className="rounded-item bg-warning-soft p-4 text-sm font-medium text-warning-soft-foreground">
          {transfer.to.displayName} chưa thêm tài khoản nhận tiền. Nhắn bạn ấy thêm trong <b>Hồ sơ</b>, hoặc trả tiền
          mặt rồi bấm "Tôi đã chuyển".
        </p>
      )}

      <DialogFooter>
        <Button className="h-11 w-full text-base" onClick={onMarkSent} disabled={pending}>
          {pending ? 'Đang ghi nhận…' : `Tôi đã chuyển ${formatVnd(transfer.amount)}`}
        </Button>
      </DialogFooter>
    </div>
  )
}
