import { Trophy } from 'lucide-react'
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
import { Skeleton } from '@/components/ui/skeleton'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useItinerary } from '@/hooks/useItinerary'
import { getErrorMessage } from '@/lib/api'
import { ITINERARY_CATEGORIES } from '@/lib/tripContent'
import type { ItineraryCategory } from '@/types/itinerary'
import type { ClosePollRequest, PollResponse } from '@/types/poll'

interface ClosePollDialogProps {
  tripId: number
  poll: PollResponse | null
  pending: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (body: ClosePollRequest) => Promise<unknown>
}

export function ClosePollDialog(props: ClosePollDialogProps) {
  return (
    <Dialog open={props.poll !== null} onOpenChange={props.onOpenChange}>
      <DialogContent className="max-h-[92svh] overflow-y-auto sm:max-w-md">
        {props.poll && <CloseForm key={props.poll.id} {...props} poll={props.poll} />}
      </DialogContent>
    </Dialog>
  )
}

function CloseForm({ tripId, poll, pending, onSubmit, onOpenChange }: ClosePollDialogProps & { poll: PollResponse }) {
  const itinerary = useItinerary(tripId)
  const top = [...poll.options].sort((a, b) => b.voteCount - a.voteCount)[0]
  const [optionId, setOptionId] = useState<number | undefined>(top?.id)
  const [addToItinerary, setAddToItinerary] = useState(true)
  const [dayId, setDayId] = useState<string>('')
  const [startTime, setStartTime] = useState('')
  const [category, setCategory] = useState<ItineraryCategory>('FOOD')
  // Chỉ các ngày trong khoảng đã chốt (bỏ ngày thừa), giống ScheduleProposalDialog
  const days = (itinerary.data?.days ?? []).filter((d) => !d.overflow)
  const canAdd = days.length > 0

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!optionId) return
    const add = addToItinerary && canAdd
    if (add && !dayId) {
      toast.error('Chọn ngày để thêm vào lịch trình')
      return
    }
    try {
      await onSubmit({
        optionId,
        addToItinerary: add ? { dayId: Number(dayId), startTime: startTime || null, category } : null,
      })
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-5">
      <DialogHeader>
        <DialogTitle>Chốt "{poll.title}"</DialogTitle>
        <DialogDescription>Chọn lựa chọn thắng. Có thể thêm luôn vào lịch trình.</DialogDescription>
      </DialogHeader>

      <ToggleGroup
        type="single"
        aria-label="Lựa chọn thắng"
        value={optionId ? String(optionId) : ''}
        onValueChange={(next) => {
          if (next) setOptionId(Number(next))
        }}
        className="grid gap-2"
      >
        {poll.options.map((o) => (
          <ToggleGroupItem
            key={o.id}
            value={String(o.id)}
            className="h-auto min-h-12 w-full justify-between gap-3 rounded-item px-4 py-2.5 text-left whitespace-normal data-[state=on]:border-warning data-[state=on]:bg-warning-soft data-[state=on]:text-warning-soft-foreground"
          >
            <span className="flex min-w-0 items-center gap-2 font-bold break-words">
              {optionId === o.id && <Trophy className="size-4 shrink-0" aria-hidden="true" />}
              {o.name}
            </span>
            <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
              {o.voteCount} phiếu
            </span>
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      {itinerary.isPending ? (
        <Skeleton className="h-28 rounded-item" />
      ) : canAdd ? (
        <div className="grid gap-3.5 rounded-item border border-border bg-muted/30 p-4">
          <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-bold text-foreground">
            <input
              type="checkbox"
              className="size-4.5 cursor-pointer rounded accent-primary-strong"
              checked={addToItinerary}
              onChange={(e) => setAddToItinerary(e.target.checked)}
            />
            Thêm vào lịch trình
          </label>
          {addToItinerary && (
            <>
              <div className="grid grid-cols-[1fr_7rem] gap-2.5">
                <div className="grid gap-1.5">
                  <Label htmlFor="close-day" className="text-xs font-semibold">
                    Ngày
                  </Label>
                  <Select value={dayId} onValueChange={setDayId}>
                    <SelectTrigger id="close-day" className="w-full">
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
                <div className="grid gap-1.5">
                  <Label htmlFor="close-time" className="text-xs font-semibold">
                    Giờ
                  </Label>
                  <Input id="close-time" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
                </div>
              </div>
              <ChoiceChips
                label="Loại hoạt động"
                options={ITINERARY_CATEGORIES}
                value={category}
                onChange={setCategory}
                className="pt-1"
              />
            </>
          )}
        </div>
      ) : (
        <p className="text-xs font-medium text-muted-foreground">
          Chốt ngày đi trước thì mới thêm được vào lịch trình.
        </p>
      )}

      <DialogFooter>
        <Button type="button" variant="outline" disabled={pending} onClick={() => onOpenChange(false)}>
          Hủy
        </Button>
        <Button type="submit" disabled={pending || !optionId}>
          {pending ? 'Đang chốt…' : 'Chốt'}
        </Button>
      </DialogFooter>
    </form>
  )
}
