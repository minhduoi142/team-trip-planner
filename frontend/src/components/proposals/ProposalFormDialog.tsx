import { useState, type FormEvent } from 'react'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { getErrorMessage, getFieldErrors } from '@/lib/api'
import { ITINERARY_CATEGORIES } from '@/lib/tripContent'
import { cn } from '@/lib/utils'
import type { ItineraryCategory } from '@/types/itinerary'
import type { ProposalRequest, ProposalResponse } from '@/types/proposal'

interface ProposalFormDialogProps {
  /** null = đóng; { proposal } = sửa; { initialTitle } = thêm mới (điền sẵn tên đang gõ) */
  target: { proposal?: ProposalResponse; initialTitle?: string } | null
  pending: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (body: ProposalRequest) => Promise<unknown>
}

export function ProposalFormDialog(props: ProposalFormDialogProps) {
  return (
    <Dialog open={props.target !== null} onOpenChange={props.onOpenChange}>
      <DialogContent className="max-h-[92svh] overflow-y-auto sm:max-w-lg">
        {props.target && (
          <ProposalForm
            key={props.target.proposal?.id ?? 'new'}
            {...props}
            proposal={props.target.proposal}
            initialTitle={props.target.initialTitle}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

const digitsOnly = (value: string) => value.replace(/\D/g, '').slice(0, 10)
const fmt = (value: string) => (value ? Number(value).toLocaleString('vi-VN') : '')

function ProposalForm({
  proposal,
  initialTitle,
  pending,
  onSubmit,
  onOpenChange,
}: Omit<ProposalFormDialogProps, 'target'> & { proposal?: ProposalResponse; initialTitle?: string }) {
  const [title, setTitle] = useState(proposal?.title ?? initialTitle ?? '')
  const [category, setCategory] = useState<ItineraryCategory>(proposal?.category ?? 'OTHER')
  const [mapsUrl, setMapsUrl] = useState(proposal?.mapsUrl ?? '')
  const [referenceUrl, setReferenceUrl] = useState(proposal?.referenceUrl ?? '')
  const [cost, setCost] = useState(proposal?.estimatedCost != null ? String(proposal.estimatedCost) : '')
  const [note, setNote] = useState(proposal?.note ?? '')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!title.trim()) {
      setErrors({ title: 'Tên đề xuất không được để trống' })
      return
    }
    try {
      await onSubmit({
        title: title.trim(),
        category,
        mapsUrl: mapsUrl.trim() || null,
        referenceUrl: referenceUrl.trim() || null,
        estimatedCost: cost ? Number(cost) : null,
        note: note.trim() || null,
      })
    } catch (error) {
      const fieldErrors = getFieldErrors(error)
      setErrors(fieldErrors)
      if (Object.keys(fieldErrors).length === 0) toast.error(getErrorMessage(error))
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      <DialogHeader>
        <DialogTitle>{proposal ? 'Sửa đề xuất' : 'Đề xuất địa điểm'}</DialogTitle>
        <DialogDescription>Quán ăn, homestay, điểm check-in… để cả nhóm thả tim.</DialogDescription>
      </DialogHeader>

      <div className="grid gap-1.5">
        <Label htmlFor="proposal-title">Tên</Label>
        <Input
          id="proposal-title"
          autoFocus={!proposal}
          maxLength={150}
          placeholder="VD: Cà phê Túi Mơ To"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          aria-invalid={!!errors.title}
        />
        {errors.title && <p className="text-sm text-destructive">{errors.title}</p>}
      </div>

      <div className="grid gap-1.5">
        <Label>Loại</Label>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Loại đề xuất">
          {ITINERARY_CATEGORIES.map((c) => (
            <button
              key={c.value}
              type="button"
              role="radio"
              aria-checked={category === c.value}
              onClick={() => setCategory(c.value)}
              className={cn(
                'flex items-center gap-1.5 rounded-full border-2 px-3 py-1.5 text-xs font-semibold transition-all duration-200 active:scale-95',
                category === c.value
                  ? 'border-rose-300 bg-gradient-to-r from-rose-500 to-rose-600 text-white shadow-clay-btn-primary'
                  : 'border-white/70 bg-card text-foreground shadow-clay-card',
              )}
            >
              <c.icon className="size-3.5" />
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="proposal-maps">Link Google Maps</Label>
        <Input
          id="proposal-maps"
          inputMode="url"
          placeholder="https://maps.app.goo.gl/…"
          value={mapsUrl}
          onChange={(e) => setMapsUrl(e.target.value)}
          aria-invalid={!!errors.mapsUrl}
        />
        {errors.mapsUrl && <p className="text-sm text-destructive">{errors.mapsUrl}</p>}
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="proposal-ref">Link tham khảo (TikTok, Facebook…)</Label>
        <Input
          id="proposal-ref"
          inputMode="url"
          placeholder="https://www.tiktok.com/@…"
          value={referenceUrl}
          onChange={(e) => setReferenceUrl(e.target.value)}
          aria-invalid={!!errors.referenceUrl}
        />
        {errors.referenceUrl && <p className="text-sm text-destructive">{errors.referenceUrl}</p>}
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="proposal-cost">Chi phí dự kiến (₫)</Label>
        <Input
          id="proposal-cost"
          inputMode="numeric"
          placeholder="Không bắt buộc"
          value={fmt(cost)}
          onChange={(e) => setCost(digitsOnly(e.target.value))}
          aria-invalid={!!errors.estimatedCost}
        />
        {errors.estimatedCost && <p className="text-sm text-destructive">{errors.estimatedCost}</p>}
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="proposal-note">Ghi chú</Label>
        <Textarea
          id="proposal-note"
          maxLength={500}
          rows={3}
          placeholder="VD: View đẹp lúc hoàng hôn, nên đặt bàn trước"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        {errors.note && <p className="text-sm text-destructive">{errors.note}</p>}
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" disabled={pending} onClick={() => onOpenChange(false)}>
          Hủy
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? 'Đang lưu…' : proposal ? 'Lưu' : 'Thêm đề xuất'}
        </Button>
      </DialogFooter>
    </form>
  )
}
