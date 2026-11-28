import { Check, Copy, FileImage, FileText, Lock, MapPin, Pencil, Phone, StickyNote, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { RowMenuButton } from '@/components/common/layout'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { documentKind, formatFileSize, timeRange } from '@/lib/documents'
import { cn } from '@/lib/utils'
import type { DocumentResponse } from '@/types/document'

interface DocumentCardProps {
  doc: DocumentResponse
  highlighted?: boolean
  onOpenFile: () => void
  onEdit: () => void
  onDelete: () => void
}

/** Một giấy tờ: mã đặt chỗ copy được, số điện thoại gọi được, file mở bằng một chạm. */
export function DocumentCard({ doc, highlighted, onOpenFile, onEdit, onDelete }: DocumentCardProps) {
  const kind = documentKind(doc.kind)
  const time = timeRange(doc)
  const [copied, setCopied] = useState(false)

  const copyCode = async () => {
    if (!doc.bookingCode) return
    try {
      await navigator.clipboard.writeText(doc.bookingCode)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      toast.error('Không copy được')
    }
  }

  return (
    <li
      id={`doc-${doc.id}`}
      className={cn(
        'grid scroll-mt-32 gap-3 rounded-surface border bg-card p-4 shadow-flat',
        highlighted ? 'border-primary ring-3 ring-primary/30' : 'border-border',
      )}
    >
      <div className="flex items-start gap-3">
        <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-control', kind.tone)}>
          <kind.icon className="size-5" aria-hidden="true" />
          <span className="sr-only">{kind.label}</span>
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-bold break-words text-foreground">{doc.title}</p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
            {time && <span className="font-semibold text-foreground tabular-nums">{time}</span>}
            {doc.visibility === 'PRIVATE' && (
              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-semibold">
                <Lock className="size-3" aria-hidden="true" />
                Chỉ mình tôi
              </span>
            )}
            {!doc.mine && doc.createdByName && <span className="text-xs">· {doc.createdByName} thêm</span>}
          </p>
        </div>
        {doc.canEdit && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <RowMenuButton label={`Tùy chọn cho ${doc.title}`} className="-mt-1 -mr-1" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={onEdit}>
                <Pencil />
                Sửa
              </DropdownMenuItem>
              <DropdownMenuItem variant="destructive" onSelect={onDelete}>
                <Trash2 />
                Xóa
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {doc.bookingCode && (
        <div className="flex items-center justify-between gap-2 rounded-item bg-muted/50 px-3 py-2">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">Mã đặt chỗ</p>
            <p className="font-mono text-lg font-bold tracking-wider break-all text-foreground">{doc.bookingCode}</p>
          </div>
          <Button variant="ghost" size="icon-sm" aria-label={`Copy mã ${doc.bookingCode}`} onClick={copyCode}>
            {copied ? <Check className="text-success" /> : <Copy />}
          </Button>
        </div>
      )}

      {(doc.place || doc.contactPhone || doc.contactName) && (
        <div className="grid gap-1.5 text-sm">
          {doc.place && (
            <p className="flex items-start gap-1.5 text-foreground">
              <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <span className="min-w-0 break-words">{doc.place}</span>
            </p>
          )}
          {(doc.contactName || doc.contactPhone) && (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="min-w-0 break-words text-foreground">
                {doc.contactName}
                {doc.contactName && doc.contactPhone && ' · '}
                {doc.contactPhone && <span className="tabular-nums">{doc.contactPhone}</span>}
              </p>
              {doc.contactPhone && (
                <Button asChild size="sm" variant="outline">
                  <a href={`tel:${doc.contactPhone.replace(/[^0-9+]/g, '')}`}>
                    <Phone />
                    Gọi
                  </a>
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {doc.note && (
        <p className="flex items-start gap-1.5 text-sm text-muted-foreground">
          <StickyNote className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span className="min-w-0 whitespace-pre-line break-words">{doc.note}</span>
        </p>
      )}

      {doc.file && (
        <button
          type="button"
          onClick={onOpenFile}
          className="flex min-h-11 items-center gap-2 rounded-item border border-border px-3 py-2 text-left text-sm outline-none hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring"
        >
          {doc.file.type === 'application/pdf' ? (
            <FileText className="size-5 shrink-0 text-primary-strong" aria-hidden="true" />
          ) : (
            <FileImage className="size-5 shrink-0 text-primary-strong" aria-hidden="true" />
          )}
          <span className="min-w-0 flex-1 truncate font-semibold text-foreground">{doc.file.name}</span>
          <span className="shrink-0 text-xs text-muted-foreground">{formatFileSize(doc.file.size)}</span>
        </button>
      )}
    </li>
  )
}
