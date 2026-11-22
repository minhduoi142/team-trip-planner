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

        <div className="grid gap-2.5" role="radiogroup" aria-label="Lựa chọn thắng">
          {poll.options.map((o) => (
            <button
              key={o.id}
              type="button"
              role="radio"
              aria-checked={optionId === o.id}
              onClick={() => setOptionId(o.id)}
              className={cn(
                'flex items-center justify-between rounded-[20px] px-4 py-3 text-left border-2 transition-all duration-200 active:scale-98',
                optionId === o.id
                  ? 'bg-amber-50/90 border-amber-400 shadow-clay-card-hover -translate-y-0.5'
                  : 'bg-card border-white/80 shadow-clay-card hover:-translate-y-0.5',
              )}
            >
                <span className="flex items-center gap-2 font-bold text-foreground">
                  {optionId === o.id && <Trophy className="size-4 text-amber-500 animate-bounce" />}
                  {o.name}
                </span>
                <span className="text-xs font-semibold text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-full border border-white/60 shadow-clay-badge">
                  {o.voteCount} phiếu
                </span>
            </button>
          ))}
        </div>

        {canAdd ? (
              <div className="grid gap-3.5 rounded-[22px] border border-white/80 bg-muted/30 p-4 shadow-clay-sunken">
                <label className="flex items-center gap-2 text-sm font-bold text-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    className="size-4.5 rounded accent-primary cursor-pointer"
                    checked={addToItinerary}
                    onChange={(e) => setAddToItinerary(e.target.checked)}
                  />
                  Thêm vào lịch trình
                </label>
                {addToItinerary && (
                  <>
                      <div className="grid grid-cols-[1fr_7rem] gap-2.5">
                        <div className="grid gap-1.5">
                          <Label htmlFor="close-day" className="font-semibold text-xs">Ngày</Label>
                          <Select value={dayId} onValueChange={setDayId}>
                              <SelectTrigger id="close-day" className="w-full rounded-full shadow-clay-card">
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
                          <Label htmlFor="close-time" className="font-semibold text-xs">Giờ</Label>
                          <Input id="close-time" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
                        </div>
                      </div>
                        <div className="flex flex-wrap gap-2 pt-1">
                          {ITINERARY_CATEGORIES.map((c) => (
                            <button
                              key={c.value}
                              type="button"
                              aria-pressed={category === c.value}
                              onClick={() => setCategory(c.value)}
                              className={cn(
                                'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all duration-200 active:scale-95 border-2',
                                category === c.value
                                  ? 'bg-gradient-to-r from-rose-500 to-rose-600 text-white border-rose-300 shadow-clay-btn-primary -translate-y-0.5'
                                  : 'bg-card text-foreground border-white/70 shadow-clay-card hover:-translate-y-0.5',
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
                    <p className="text-xs text-muted-foreground font-medium">Chốt ngày đi trước thì mới thêm được vào lịch trình.</p>
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
