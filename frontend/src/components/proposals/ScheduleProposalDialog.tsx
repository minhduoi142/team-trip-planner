import { CalendarPlus } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { ChoiceChips } from '@/components/common/ChoiceChips'
import { dayLabel } from '@/components/itinerary/dayLabel'
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { useItinerary } from '@/hooks/useItinerary'
import { getErrorMessage } from '@/lib/api'
import { ITINERARY_CATEGORIES } from '@/lib/tripContent'
import type { ItineraryCategory } from '@/types/itinerary'
import type { ProposalResponse, ScheduleProposalRequest } from '@/types/proposal'

interface ScheduleProposalDialogProps {
  tripId: number
  proposal: ProposalResponse | null
  pending: boolean
  onOpenChange: (open: boolean) => void
  /** Trả về nhãn ngày để báo toast */
  onSubmit: (body: ScheduleProposalRequest, dayText: string) => Promise<unknown>
}

export function ScheduleProposalDialog(props: ScheduleProposalDialogProps) {
  return (
    <Dialog open={props.proposal !== null} onOpenChange={props.onOpenChange}>
      <DialogContent className="max-h-[92svh] overflow-y-auto sm:max-w-md">
        {props.proposal && <ScheduleForm key={props.proposal.id} {...props} proposal={props.proposal} />}
      </DialogContent>
    </Dialog>
  )
}

function ScheduleForm({
  tripId,
  proposal,
  pending,
  onSubmit,
  onOpenChange,
}: ScheduleProposalDialogProps & { proposal: ProposalResponse }) {
  const itinerary = useItinerary(tripId)
  // Chỉ các ngày trong khoảng đã chốt (bỏ ngày thừa)
  const days = (itinerary.data?.days ?? []).filter((d) => !d.overflow)
  const [dayId, setDayId] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [category, setCategory] = useState<ItineraryCategory>(proposal.category)
  const [error, setError] = useState<string | null>(null)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const day = days.find((d) => String(d.id) === dayId)
    if (!day) {
      setError('Chọn ngày để đưa vào lịch trình')
      return
    }
    if (endTime && !startTime) {
      setError('Có giờ kết thúc thì cần nhập giờ bắt đầu')
      return
    }
    setError(null)
    try {
      await onSubmit(
        { dayId: day.id, startTime: startTime || null, endTime: endTime || null, category },
        `Ngày ${day.dayIndex}`,
      )
    } catch (e) {
      toast.error(getErrorMessage(e))
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      <DialogHeader>
        <DialogTitle>Đưa vào lịch trình</DialogTitle>
        <DialogDescription>
          "{proposal.title}" sẽ thành một hoạt động, tự xếp theo giờ trong ngày. Link Maps và ghi chú được chép theo.
        </DialogDescription>
      </DialogHeader>

      {itinerary.isPending ? (
        <Skeleton className="h-10 rounded-control" />
      ) : (
        <div className="grid gap-1.5">
          <Label htmlFor="schedule-day">Ngày</Label>
          <Select value={dayId} onValueChange={setDayId}>
            <SelectTrigger id="schedule-day" className="w-full">
              <SelectValue placeholder="Chọn ngày" />
            </SelectTrigger>
            <SelectContent>
              {days.map((d) => (
                <SelectItem key={d.id} value={String(d.id)}>
                  {dayLabel(d)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2.5">
        <div className="grid gap-1.5">
          <Label htmlFor="schedule-start">Bắt đầu</Label>
          <Input id="schedule-start" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="schedule-end">Kết thúc</Label>
          <Input id="schedule-end" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
        </div>
      </div>

      <div className="grid gap-1.5">
        <p className="text-sm leading-tight font-medium" aria-hidden="true">
          Loại hoạt động
        </p>
        <ChoiceChips label="Loại hoạt động" options={ITINERARY_CATEGORIES} value={category} onChange={setCategory} />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <DialogFooter>
        <Button type="button" variant="outline" disabled={pending} onClick={() => onOpenChange(false)}>
          Hủy
        </Button>
        <Button type="submit" disabled={pending || days.length === 0}>
          <CalendarPlus />
          {pending ? 'Đang thêm…' : 'Thêm vào lịch trình'}
        </Button>
      </DialogFooter>
    </form>
  )
}
