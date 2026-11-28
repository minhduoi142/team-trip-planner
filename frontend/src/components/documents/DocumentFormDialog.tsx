import { FileUp, Lock, Users, X } from 'lucide-react'
import { useRef, useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { FormField } from '@/components/FormField'
import { ChoiceChips } from '@/components/common/ChoiceChips'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { getErrorMessage, getFieldErrors } from '@/lib/api'
import { DOCUMENT_KINDS, defaultVisibility, documentKind, formatFileSize, toInputValue } from '@/lib/documents'
import type { DocumentKind, DocumentRequest, DocumentResponse, DocumentVisibility } from '@/types/document'

/** Cùng giới hạn với backend (DocumentService.MAX_BYTES). Ảnh sẽ được nén trước khi gửi. */
const MAX_PDF_BYTES = 10 * 1024 * 1024
const ACCEPT = 'image/jpeg,image/png,image/webp,application/pdf,.pdf'

export interface DocumentFormResult {
  body: DocumentRequest
  /** File mới chọn (null = giữ nguyên) */
  file: File | null
  /** Bỏ file đang có */
  removeFile: boolean
}

interface DocumentFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Có = sửa */
  doc?: DocumentResponse
  pending: boolean
  progress: number | null
  onSubmit: (result: DocumentFormResult) => Promise<unknown>
}

export function DocumentFormDialog(props: DocumentFormDialogProps) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="max-h-[92svh] overflow-y-auto sm:max-w-lg">
        {props.open && <DocumentForm key={props.doc?.id ?? 'new'} {...props} />}
      </DialogContent>
    </Dialog>
  )
}

const VISIBILITY_OPTIONS: { value: DocumentVisibility; label: string; icon: typeof Users }[] = [
  { value: 'SHARED', label: 'Cả nhóm', icon: Users },
  { value: 'PRIVATE', label: 'Chỉ mình tôi', icon: Lock },
]

function DocumentForm({ doc, pending, progress, onSubmit, onOpenChange }: DocumentFormDialogProps) {
  const [kind, setKind] = useState<DocumentKind>(doc?.kind ?? 'FLIGHT')
  const [visibility, setVisibility] = useState<DocumentVisibility>(doc?.visibility ?? 'SHARED')
  /** Người dùng đã tự chọn "Ai thấy" → đổi loại không ghi đè nữa */
  const [visibilityTouched, setVisibilityTouched] = useState(Boolean(doc))
  const [title, setTitle] = useState(doc?.title ?? '')
  const [bookingCode, setBookingCode] = useState(doc?.bookingCode ?? '')
  const [startsAt, setStartsAt] = useState(toInputValue(doc?.startsAt ?? null))
  const [endsAt, setEndsAt] = useState(toInputValue(doc?.endsAt ?? null))
  const [place, setPlace] = useState(doc?.place ?? '')
  const [contactName, setContactName] = useState(doc?.contactName ?? '')
  const [contactPhone, setContactPhone] = useState(doc?.contactPhone ?? '')
  const [note, setNote] = useState(doc?.note ?? '')
  const [file, setFile] = useState<File | null>(null)
  const [removeFile, setRemoveFile] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const inputRef = useRef<HTMLInputElement>(null)
  const info = documentKind(kind)

  const changeKind = (next: DocumentKind) => {
    setKind(next)
    if (!visibilityTouched) setVisibility(defaultVisibility(next))
  }

  const pickFile = (picked: File | undefined) => {
    if (!picked) return
    const isPdf = picked.type === 'application/pdf' || picked.name.toLowerCase().endsWith('.pdf')
    if (isPdf && picked.size > MAX_PDF_BYTES) {
      toast.error('File PDF quá lớn, tối đa 10 MB')
      return
    }
    if (!isPdf && !picked.type.startsWith('image/')) {
      toast.error('Chỉ hỗ trợ ảnh JPG, PNG, WebP hoặc file PDF')
      return
    }
    setFile(picked)
    setRemoveFile(false)
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const clientErrors: Record<string, string> = {}
    if (!title.trim()) clientErrors.title = 'Nhập tên giấy tờ'
    if (startsAt && endsAt && endsAt < startsAt) clientErrors.endsAt = 'Giờ kết thúc phải sau giờ bắt đầu'
    setErrors(clientErrors)
    if (Object.keys(clientErrors).length > 0) return
    const orNull = (v: string) => v.trim() || null
    try {
      await onSubmit({
        body: {
          kind,
          title: title.trim(),
          bookingCode: orNull(bookingCode),
          startsAt: startsAt || null,
          endsAt: endsAt || null,
          place: orNull(place),
          contactName: orNull(contactName),
          contactPhone: orNull(contactPhone),
          note: orNull(note),
          visibility,
        },
        file,
        removeFile,
      })
    } catch (error) {
      const fieldErrors = getFieldErrors(error)
      setErrors(fieldErrors)
      if (Object.keys(fieldErrors).length === 0) toast.error(getErrorMessage(error))
    }
  }

  const currentFile = removeFile ? null : (doc?.file ?? null)
  return (
    <form onSubmit={submit} className="grid gap-5" noValidate>
      <DialogHeader>
        <DialogTitle>{doc ? 'Sửa giấy tờ' : 'Thêm giấy tờ'}</DialogTitle>
        <DialogDescription>Mã đặt chỗ, giờ, số điện thoại và file vé để mở nhanh khi cần.</DialogDescription>
      </DialogHeader>

      <ChoiceChips
        label="Loại giấy tờ"
        options={DOCUMENT_KINDS.map((k) => ({ value: k.value, label: k.label, icon: k.icon }))}
        value={kind}
        onChange={changeKind}
      />

      <FormField id="doc-title" label="Tên" error={errors.title}>
        <Input
          id="doc-title"
          autoFocus
          maxLength={150}
          placeholder={kind === 'FLIGHT' ? 'VD: Bay HCM → Phú Quốc VJ321' : 'VD: Homestay Dương Đông'}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </FormField>

      <FormField id="doc-code" label="Mã đặt chỗ" optional error={errors.bookingCode}>
        <Input
          id="doc-code"
          maxLength={50}
          autoCapitalize="characters"
          className="font-mono uppercase"
          placeholder="VD: ABC123"
          value={bookingCode}
          onChange={(e) => setBookingCode(e.target.value)}
        />
      </FormField>

      <div className="grid gap-3 sm:grid-cols-2">
        <FormField id="doc-start" label={info.startLabel} optional error={errors.startsAt}>
          <Input id="doc-start" type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
        </FormField>
        <FormField id="doc-end" label={info.endLabel} optional error={errors.endsAt}>
          <Input id="doc-end" type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
        </FormField>
      </div>

      <FormField id="doc-place" label="Địa điểm" optional error={errors.place}>
        <Input
          id="doc-place"
          maxLength={150}
          placeholder="VD: Sân bay Tân Sơn Nhất, nhà ga T1"
          value={place}
          onChange={(e) => setPlace(e.target.value)}
        />
      </FormField>

      <div className="grid gap-3 sm:grid-cols-2">
        <FormField id="doc-contact" label="Người liên hệ" optional error={errors.contactName}>
          <Input
            id="doc-contact"
            maxLength={100}
            placeholder="VD: Chị Hoa chủ nhà"
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
          />
        </FormField>
        <FormField id="doc-phone" label="Số điện thoại" optional error={errors.contactPhone}>
          <Input
            id="doc-phone"
            type="tel"
            inputMode="tel"
            maxLength={20}
            placeholder="VD: 0909 123 456"
            value={contactPhone}
            onChange={(e) => setContactPhone(e.target.value)}
          />
        </FormField>
      </div>

      <FormField id="doc-note" label="Ghi chú" optional error={errors.note}>
        <Textarea id="doc-note" rows={2} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
      </FormField>

      <div className="grid gap-2">
        <p className="text-sm font-medium text-foreground">File vé / ảnh chụp</p>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={(e) => {
            pickFile(e.target.files?.[0])
            e.target.value = ''
          }}
        />
        {file || currentFile ? (
          <div className="flex items-center gap-2 rounded-item border border-border px-3 py-2 text-sm">
            <span className="min-w-0 flex-1 truncate font-semibold">{file ? file.name : currentFile?.name}</span>
            <span className="shrink-0 text-xs text-muted-foreground">
              {formatFileSize(file ? file.size : (currentFile?.size ?? 0))}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Bỏ file"
              onClick={() => {
                if (file) setFile(null)
                else setRemoveFile(true)
              }}
            >
              <X />
            </Button>
          </div>
        ) : null}
        <Button
          type="button"
          variant="outline"
          className="justify-self-start"
          onClick={() => inputRef.current?.click()}
        >
          <FileUp />
          {file || currentFile ? 'Đổi file' : 'Chọn ảnh hoặc PDF'}
        </Button>
        <p className="text-xs text-muted-foreground">
          File lưu ở kho riêng, chỉ thành viên (hoặc chỉ bạn, nếu chọn "Chỉ mình tôi") mở được.
        </p>
      </div>

      <div className="grid gap-2">
        <p className="text-sm font-medium text-foreground">Ai thấy</p>
        <ChoiceChips
          label="Ai thấy"
          options={VISIBILITY_OPTIONS}
          value={visibility}
          onChange={(v) => {
            setVisibility(v)
            setVisibilityTouched(true)
          }}
        />
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" disabled={pending} onClick={() => onOpenChange(false)}>
          Hủy
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? (progress !== null ? `Đang tải file ${progress}%` : 'Đang lưu…') : doc ? 'Lưu' : 'Thêm giấy tờ'}
        </Button>
      </DialogFooter>
    </form>
  )
}
