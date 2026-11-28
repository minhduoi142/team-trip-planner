import { BedDouble, FileText, IdCard, Plane, ShieldCheck, Ticket, TrainFront, type LucideIcon } from 'lucide-react'
import type { IsoDate } from '@/types/api'
import type { DocumentKind, DocumentResponse, DocumentVisibility, LocalDateTimeString } from '@/types/document'

interface KindInfo {
  value: DocumentKind
  label: string
  icon: LucideIcon
  tone: string
  /** Nhãn cho 2 ô giờ, theo loại */
  startLabel: string
  endLabel: string
  /** Mặc định "Chỉ mình tôi" (docs/sdd-trip-documents.md 1.2), đồng bộ DocumentEnums.Kind.privateByDefault */
  privateByDefault: boolean
}

/** Đúng thứ tự DocumentEnums.Kind ở backend. */
export const DOCUMENT_KINDS: KindInfo[] = [
  {
    value: 'FLIGHT',
    label: 'Máy bay',
    icon: Plane,
    tone: 'bg-avatar-4 text-avatar-4-foreground',
    startLabel: 'Giờ cất cánh',
    endLabel: 'Giờ hạ cánh',
    privateByDefault: false,
  },
  {
    value: 'BUS_TRAIN',
    label: 'Xe / tàu',
    icon: TrainFront,
    tone: 'bg-avatar-6 text-avatar-6-foreground',
    startLabel: 'Giờ khởi hành',
    endLabel: 'Giờ đến',
    privateByDefault: false,
  },
  {
    value: 'STAY',
    label: 'Chỗ ở',
    icon: BedDouble,
    tone: 'bg-avatar-3 text-avatar-3-foreground',
    startLabel: 'Nhận phòng',
    endLabel: 'Trả phòng',
    privateByDefault: false,
  },
  {
    value: 'TICKET',
    label: 'Vé tham quan',
    icon: Ticket,
    tone: 'bg-avatar-5 text-avatar-5-foreground',
    startLabel: 'Bắt đầu',
    endLabel: 'Kết thúc',
    privateByDefault: false,
  },
  {
    value: 'INSURANCE',
    label: 'Bảo hiểm',
    icon: ShieldCheck,
    tone: 'bg-avatar-2 text-avatar-2-foreground',
    startLabel: 'Hiệu lực từ',
    endLabel: 'Đến',
    privateByDefault: true,
  },
  {
    value: 'ID',
    label: 'Giấy tờ tùy thân',
    icon: IdCard,
    tone: 'bg-avatar-1 text-avatar-1-foreground',
    startLabel: 'Từ',
    endLabel: 'Đến',
    privateByDefault: true,
  },
  {
    value: 'OTHER',
    label: 'Khác',
    icon: FileText,
    tone: 'bg-avatar-8 text-avatar-8-foreground',
    startLabel: 'Bắt đầu',
    endLabel: 'Kết thúc',
    privateByDefault: false,
  },
]

const BY_KIND = new Map(DOCUMENT_KINDS.map((k) => [k.value, k]))

export function documentKind(kind: DocumentKind): KindInfo {
  return BY_KIND.get(kind) ?? DOCUMENT_KINDS[DOCUMENT_KINDS.length - 1]
}

export function defaultVisibility(kind: DocumentKind): DocumentVisibility {
  return documentKind(kind).privateByDefault ? 'PRIVATE' : 'SHARED'
}

/** "2026-12-04T08:00[:00]" → "2026-12-04" (không qua Date để khỏi lệch múi giờ: đây là giờ địa phương nơi đến) */
export function datePart(value: LocalDateTimeString | null): IsoDate | null {
  return value ? value.slice(0, 10) : null
}

/** → "08:00" */
export function timePart(value: LocalDateTimeString | null): string | null {
  return value && value.length >= 16 ? value.slice(11, 16) : null
}

/** Giá trị cho <input type="datetime-local"> ("yyyy-MM-ddTHH:mm") */
export function toInputValue(value: LocalDateTimeString | null): string {
  return value ? value.slice(0, 16) : ''
}

/** "08:00 → 09:05", "14:00 → 12:00 06/12" (khác ngày), hoặc "08:00" */
export function timeRange(doc: Pick<DocumentResponse, 'startsAt' | 'endsAt'>): string | null {
  const start = timePart(doc.startsAt)
  const end = timePart(doc.endsAt)
  if (!start && !end) return null
  if (!end) return start
  const sameDay = datePart(doc.startsAt) === datePart(doc.endsAt)
  const endDate = datePart(doc.endsAt)
  const endLabel = sameDay || !endDate ? end : `${end} ${endDate.slice(8, 10)}/${endDate.slice(5, 7)}`
  return start ? `${start} → ${endLabel}` : `đến ${endLabel}`
}

/** Giấy tờ dính tới ngày này: bắt đầu hoặc kết thúc trong ngày (vd nhận phòng ngày 1, trả phòng ngày 3). */
export function documentsOnDate(docs: DocumentResponse[], date: IsoDate): DocumentResponse[] {
  return docs.filter((d) => datePart(d.startsAt) === date || datePart(d.endsAt) === date)
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}
