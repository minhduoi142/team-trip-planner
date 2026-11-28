import { FolderLock, Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { EmptyState, TabErrorState, TabSkeleton } from '@/components/common/states'
import { Button } from '@/components/ui/button'
import {
  useCreateDocument,
  useDeleteDocument,
  useDocuments,
  useRemoveDocumentFile,
  useUpdateDocument,
  useUploadDocumentFile,
} from '@/hooks/useDocuments'
import { getErrorMessage } from '@/lib/api'
import { formatShortDate } from '@/lib/date'
import { datePart } from '@/lib/documents'
import type { DocumentResponse } from '@/types/document'
import { DocumentCard } from './DocumentCard'
import { DocumentFormDialog, type DocumentFormResult } from './DocumentFormDialog'
import { DocumentViewer } from './DocumentViewer'

/** Ví giấy tờ của chuyến (docs/sdd-trip-documents.md), mục "Giấy tờ" trong tab Chuẩn bị. */
export function DocumentsPanel({ tripId }: { tripId: number }) {
  const documents = useDocuments(tripId)
  const create = useCreateDocument(tripId)
  const update = useUpdateDocument(tripId)
  const remove = useDeleteDocument(tripId)
  const removeFile = useRemoveDocumentFile(tripId)
  const upload = useUploadDocumentFile(tripId)
  const [params] = useSearchParams()
  const focusId = Number(params.get('doc')) || null

  const [form, setForm] = useState<{ doc?: DocumentResponse } | null>(null)
  const [viewing, setViewing] = useState<DocumentResponse | null>(null)
  const [toDelete, setToDelete] = useState<DocumentResponse | null>(null)

  // Mở từ dòng "Giấy tờ hôm nay" ở Lịch trình (?doc=): cuộn tới thẻ đó
  const loaded = documents.isSuccess
  useEffect(() => {
    if (!loaded || !focusId) return
    const timer = window.setTimeout(
      () => document.getElementById(`doc-${focusId}`)?.scrollIntoView({ block: 'start', behavior: 'smooth' }),
      100,
    )
    return () => window.clearTimeout(timer)
  }, [loaded, focusId])

  if (documents.isPending) return <TabSkeleton rows={3} />
  if (documents.isError) return <TabErrorState error={documents.error} onRetry={() => documents.refetch()} />

  const docs = documents.data.documents
  const onError = (e: unknown) => toast.error(getErrorMessage(e))

  // Nhóm theo ngày (giờ địa phương nơi đến); không có giờ xếp cuối
  const groups = new Map<string, DocumentResponse[]>()
  for (const d of docs) {
    const key = datePart(d.startsAt) ?? ''
    groups.set(key, [...(groups.get(key) ?? []), d])
  }

  const submit = async ({ body, file, removeFile: drop }: DocumentFormResult) => {
    const editing = form?.doc
    let id: number
    if (editing) {
      await update.mutateAsync({ id: editing.id, body })
      id = editing.id
    } else {
      const res = await create.mutateAsync(body)
      // Giấy tờ vừa tạo = id lớn nhất trong các giấy tờ của mình
      id = Math.max(...res.documents.filter((d) => d.mine).map((d) => d.id))
    }
    try {
      if (file) await upload.mutateAsync({ id, file })
      else if (drop && editing?.file) await removeFile.mutateAsync(id)
    } catch (error) {
      // Thông tin đã lưu; chỉ file lỗi → đóng form, báo riêng để người dùng thử lại
      setForm(null)
      toast.error(`Đã lưu giấy tờ nhưng chưa tải được file: ${getErrorMessage(error)}`)
      return
    }
    setForm(null)
    toast.success(editing ? 'Đã lưu giấy tờ' : 'Đã thêm giấy tờ')
  }

  const addButton = (
    <Button onClick={() => setForm({})}>
      <Plus />
      Thêm giấy tờ
    </Button>
  )

  return (
    <div className="grid gap-4">
      {docs.length === 0 ? (
        <EmptyState
          icon={FolderLock}
          title="Chưa có giấy tờ nào"
          description="Lưu mã đặt vé, đặt phòng, số điện thoại chủ nhà và ảnh vé để mở nhanh khi làm thủ tục."
          action={addButton}
        />
      ) : (
        <>
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-bold">
              Giấy tờ <span className="text-muted-foreground">({docs.length})</span>
            </h2>
            {addButton}
          </div>
          {[...groups.entries()].map(([date, items]) => (
            <section
              key={date || 'none'}
              className="grid gap-2"
              aria-label={date ? formatShortDate(date) : 'Chưa có giờ'}
            >
              <h3 className="px-1 text-sm font-bold text-foreground">{date ? formatShortDate(date) : 'Chưa có giờ'}</h3>
              <ul className="grid gap-3">
                {items.map((d) => (
                  <DocumentCard
                    key={d.id}
                    doc={d}
                    highlighted={d.id === focusId}
                    onOpenFile={() => setViewing(d)}
                    onEdit={() => setForm({ doc: d })}
                    onDelete={() => setToDelete(d)}
                  />
                ))}
              </ul>
            </section>
          ))}
        </>
      )}

      <DocumentFormDialog
        open={form !== null}
        onOpenChange={(open) => !open && setForm(null)}
        doc={form?.doc}
        pending={create.isPending || update.isPending || upload.isPending || removeFile.isPending}
        progress={upload.progress}
        onSubmit={submit}
      />
      <DocumentViewer doc={viewing} onOpenChange={(open) => !open && setViewing(null)} />
      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(open) => !open && setToDelete(null)}
        title="Xóa giấy tờ này?"
        description={toDelete ? `"${toDelete.title}" và file đính kèm sẽ bị xóa hẳn.` : ''}
        confirmLabel="Xóa"
        destructive
        pending={remove.isPending}
        onConfirm={() =>
          toDelete &&
          remove.mutate(toDelete.id, {
            onSuccess: () => {
              setToDelete(null)
              toast.success('Đã xóa giấy tờ')
            },
            onError,
          })
        }
      />
    </div>
  )
}
