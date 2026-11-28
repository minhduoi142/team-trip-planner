import { Download, ExternalLink, Loader2 } from 'lucide-react'
import { useEffect, useMemo } from 'react'
import { TabErrorState } from '@/components/common/states'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useDocumentFile } from '@/hooks/useDocuments'
import type { DocumentResponse } from '@/types/document'

/**
 * Xem file của giấy tờ (docs/sdd-trip-documents.md 4.2). File ở kho riêng tư nên tải qua API thành Blob rồi dùng
 * object URL (thu hồi khi đóng). Ảnh xem ngay; PDF mở tab mới (trình duyệt điện thoại không nhúng PDF ổn định).
 */
export function DocumentViewer({
  doc,
  onOpenChange,
}: {
  doc: DocumentResponse | null
  onOpenChange: (o: boolean) => void
}) {
  return (
    <Dialog open={doc !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[94svh] overflow-y-auto sm:max-w-2xl">
        {doc && <ViewerBody key={`${doc.id}-${doc.updatedAt}`} doc={doc} />}
      </DialogContent>
    </Dialog>
  )
}

function ViewerBody({ doc }: { doc: DocumentResponse }) {
  const file = useDocumentFile(doc.id, doc.updatedAt, doc.file !== null)
  const url = useMemo(() => (file.data ? URL.createObjectURL(file.data) : null), [file.data])
  // Thu hồi object URL khi đổi file / đóng: vé, CCCD không nằm lại trong bộ nhớ trình duyệt
  useEffect(
    () => () => {
      if (url) URL.revokeObjectURL(url)
    },
    [url],
  )

  const isPdf = doc.file?.type === 'application/pdf'
  const fileName = doc.file?.name ?? 'giay-to'

  const save = () => {
    if (!url) return
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    link.click()
  }

  return (
    <div className="grid gap-4">
      <DialogHeader>
        <DialogTitle className="break-words">{doc.title}</DialogTitle>
        <DialogDescription className="break-all">{fileName}</DialogDescription>
      </DialogHeader>

      {file.isError ? (
        <TabErrorState error={file.error} onRetry={() => file.refetch()} title="Không mở được file" />
      ) : !url ? (
        <div className="flex h-48 items-center justify-center text-muted-foreground" aria-busy="true">
          <Loader2 className="size-6 animate-spin" aria-hidden="true" />
          <span className="sr-only">Đang tải file</span>
        </div>
      ) : isPdf ? (
        <p className="rounded-item border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
          File PDF. Bấm "Mở PDF" để xem, hoặc lưu về máy để mở khi không có mạng.
        </p>
      ) : (
        <img
          src={url}
          alt={`File đính kèm của ${doc.title}`}
          className="max-h-[70svh] w-full rounded-item border border-border bg-white object-contain"
        />
      )}

      <div className="flex flex-wrap justify-end gap-2">
        {isPdf && (
          <Button variant="outline" disabled={!url} onClick={() => url && window.open(url, '_blank', 'noopener')}>
            <ExternalLink />
            Mở PDF
          </Button>
        )}
        <Button disabled={!url} onClick={save}>
          <Download />
          Lưu về máy
        </Button>
      </div>
    </div>
  )
}
