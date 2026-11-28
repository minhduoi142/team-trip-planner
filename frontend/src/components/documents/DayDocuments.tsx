import { FolderLock } from 'lucide-react'
import { useSearchParams } from 'react-router'
import { useDocuments } from '@/hooks/useDocuments'
import { documentKind, documentsOnDate, timePart, datePart } from '@/lib/documents'
import type { IsoDate } from '@/types/api'

/**
 * Dòng "Giấy tờ hôm nay" trong dải tóm tắt của ngày (docs/sdd-trip-documents.md 1.1): giấy tờ bắt đầu hoặc kết thúc
 * trong ngày. Bấm → tab Chuẩn bị › Giấy tờ, cuộn tới đúng giấy tờ. Ngày không có thì không hiện gì.
 */
export function DayDocuments({ tripId, date }: { tripId: number; date: IsoDate | null }) {
  const documents = useDocuments(tripId)
  const [, setParams] = useSearchParams()
  if (!date || !documents.data) return null
  const docs = documentsOnDate(documents.data.documents, date)
  if (docs.length === 0) return null

  const open = (id: number) =>
    setParams((prev) => {
      const next = new URLSearchParams(prev)
      next.set('tab', 'checklist')
      next.set('view', 'docs')
      next.set('doc', String(id))
      return next
    })

  return (
    <section aria-label="Giấy tờ hôm nay" className="grid gap-2 px-4 py-3">
      <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
        <FolderLock className="size-4 text-muted-foreground" aria-hidden="true" />
        Giấy tờ hôm nay
      </p>
      <ul className="flex flex-wrap gap-2">
        {docs.map((d) => {
          const kind = documentKind(d.kind)
          // Trả phòng hôm nay (bắt đầu từ hôm trước) thì hiện giờ kết thúc
          const time = datePart(d.startsAt) === date ? timePart(d.startsAt) : timePart(d.endsAt)
          return (
            <li key={d.id} className="min-w-0 max-w-full">
              <button
                type="button"
                onClick={() => open(d.id)}
                className="flex min-h-10 max-w-full items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-left text-sm outline-none hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring"
              >
                <kind.icon className="size-4 shrink-0 text-primary-strong" aria-hidden="true" />
                {time && <span className="shrink-0 font-semibold tabular-nums">{time}</span>}
                <span className="min-w-0 truncate">{d.title}</span>
                {d.bookingCode && (
                  <span className="shrink-0 font-mono text-xs text-muted-foreground">{d.bookingCode}</span>
                )}
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
