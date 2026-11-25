import { Check, CloudLightning, Droplets, Flame, ListPlus, Snowflake, Sun, Wind, type LucideIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { useChecklist, useCreateChecklistItem } from '@/hooks/useChecklist'
import { getErrorMessage } from '@/lib/api'
import { cn } from '@/lib/utils'
import type { AdviceResponse, AdviceType } from '@/types/weather'

const STYLES: Record<AdviceType, { icon: LucideIcon; className: string }> = {
  STORM: { icon: CloudLightning, className: 'border-violet-200 bg-violet-50/90 text-violet-900' },
  RAIN: { icon: Droplets, className: 'border-sky-200 bg-sky-50/90 text-sky-900' },
  COLD: { icon: Snowflake, className: 'border-cyan-200 bg-cyan-50/90 text-cyan-900' },
  HOT: { icon: Flame, className: 'border-orange-200 bg-orange-50/90 text-orange-900' },
  UV: { icon: Sun, className: 'border-amber-200 bg-amber-50/90 text-amber-900' },
  WIND: { icon: Wind, className: 'border-slate-200 bg-slate-50/90 text-slate-800' },
}

const normalize = (name: string) => name.trim().toLocaleLowerCase('vi')

interface WeatherAdviceListProps {
  tripId: number
  advice: AdviceResponse[]
  canEdit: boolean
}

/**
 * Gợi ý từ dự báo (docs/sdd-weather.md §6.2). EDITOR+ thêm món gợi ý vào checklist chung bằng endpoint có sẵn;
 * checklist đã có món cùng tên (không phân biệt hoa thường) thì nút thành "Đã có trong checklist".
 */
export function WeatherAdviceList({ tripId, advice, canEdit }: WeatherAdviceListProps) {
  const needsChecklist = canEdit && advice.some((a) => a.checklistItem !== null)
  const checklist = useChecklist(tripId, needsChecklist)
  const createItem = useCreateChecklistItem(tripId)
  if (advice.length === 0) return null

  const existing = new Set((checklist.data?.items ?? []).map((item) => normalize(item.itemName)))

  return (
    <ul className="grid gap-2" aria-label="Gợi ý theo thời tiết">
      {advice.map((a) => {
        const { icon: Icon, className } = STYLES[a.type]
        const item = a.checklistItem
        const added = item !== null && existing.has(normalize(item.itemName))
        const adding = createItem.isPending && createItem.variables?.itemName === item?.itemName
        return (
          <li
            key={a.type}
            className={cn(
              'flex flex-wrap items-center justify-between gap-2 rounded-[20px] border-2 px-3.5 py-2 text-sm shadow-clay-badge',
              className,
            )}
          >
            <span className="flex min-w-0 items-center gap-2 font-medium">
              <Icon className="size-4 shrink-0" />
              {a.text}
            </span>
            {canEdit && item && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 rounded-full bg-white/80 px-3 text-xs"
                disabled={added || adding || checklist.isLoading}
                onClick={() =>
                  createItem.mutate(
                    { itemName: item.itemName, category: item.category, quantity: 1, assigneeId: null },
                    {
                      onSuccess: () => toast.success(`Đã thêm "${item.itemName}" vào checklist`),
                      onError: (error) => toast.error(getErrorMessage(error)),
                    },
                  )
                }
              >
                {added ? <Check /> : <ListPlus />}
                {added ? 'Đã có trong checklist' : `Thêm "${item.itemName}" vào checklist`}
              </Button>
            )}
          </li>
        )
      })}
    </ul>
  )
}
