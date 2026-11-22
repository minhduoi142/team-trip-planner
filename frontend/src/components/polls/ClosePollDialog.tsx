import { Trophy } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
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
import { useItinerary } from '@/hooks/useItinerary'
import { getErrorMessage } from '@/lib/api'
import { ITINERARY_CATEGORIES } from '@/lib/tripContent'
import { cn } from '@/lib/utils'
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
  const days = itinerary.data?.days ?? []
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

      <div className="grid gap-2" role="radiogroup" aria-label="Lựa chọn thắng">
        {poll.options.map((o) => (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={optionId === o.id}
            onClick={() => setOptionId(o.id)}
            className={cn(
              'flex items-center justify-between rounded-2xl px-4 py-3 text-left ring-1 ring-border transition',
              optionId === o.id && 'bg-amber-50 ring-2 ring-amber-400',
            )}
          >
            <span className="flex items-center gap-2 font-medium">
              {optionId === o.id && <Trophy className="size-4 text-amber-500" />}
              {o.name}
            </span>
            <span className="text-sm text-muted-foreground">{o.voteCount} phiếu</span>
          </button>
        ))}
      </div>

      {canAdd ? (
        <div className="grid gap-3 rounded-2xl bg-muted/50 p-3">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              className="size-4 accent-primary"
              checked={addToItinerary}
              onChange={(e) => setAddToItinerary(e.target.checked)}
            />
            Thêm vào lịch trình
          </label>
          {addToItinerary && (
            <>
              <div className="grid grid-cols-[1fr_7rem] gap-2">
                <div className="grid gap-1.5">
                  <Label htmlFor="close-day">Ngày</Label>
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
                  <Label htmlFor="close-time">Giờ</Label>
                  <Input id="close-time" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {ITINERARY_CATEGORIES.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    aria-pressed={category === c.value}
                    onClick={() => setCategory(c.value)}
                    className={cn(
                      'flex items-center gap-1 rounded-full px-2.5 py-1 text-xs ring-1 ring-border',
                      category === c.value ? 'bg-foreground text-background' : 'bg-background',
                    )}
                  >
                    <c.icon className="size-3.5" />
                    {c.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Chốt ngày đi trước thì mới thêm được vào lịch trình.</p>
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
