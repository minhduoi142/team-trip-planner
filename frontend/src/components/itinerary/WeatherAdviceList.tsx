import { Check, CloudLightning, Droplets, Flame, ListPlus, Snowflake, Sun, Wind, type LucideIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { useChecklist, useCreateChecklistItem } from '@/hooks/useChecklist'
import { getErrorMessage } from '@/lib/api'
import { cn } from '@/lib/utils'
import type { AdviceResponse, AdviceType } from '@/types/weather'

/**
 * Một kiểu chung cho mọi gợi ý, chỉ icon mang màu; STORM nổi hơn bằng nền warning (docs/ui-slop-audit.md P3-LT-15).
 */
const STYLES: Record<AdviceType, { icon: LucideIcon; iconClass: string; rowClass?: string }> = {
  STORM: {
    icon: CloudLightning,
    iconClass: 'text-warning',
    rowClass: 'bg-warning-soft text-warning-soft-foreground',
  },
  RAIN: { icon: Droplets, iconClass: 'text-info' },
  COLD: { icon: Snowflake, iconClass: 'text-info' },
  HOT: { icon: Flame, iconClass: 'text-warning' },
  UV: { icon: Sun, iconClass: 'text-warning' },
  WIND: { icon: Wind, iconClass: 'text-muted-foreground' },
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
        const { icon: Icon, iconClass, rowClass } = STYLES[a.type]
        const item = a.checklistItem
        const added = item !== null && existing.has(normalize(item.itemName))
        const adding = createItem.isPending && createItem.variables?.itemName === item?.itemName
        return (
          <li
            key={a.type}
            className={cn(
              'flex flex-wrap items-center justify-between gap-x-3 gap-y-2 rounded-item bg-muted/60 px-3 py-2 text-sm text-foreground',
              rowClass,
            )}
          >
            <span className="flex min-w-0 flex-1 items-start gap-2">
              <Icon className={cn('mt-0.5 size-4 shrink-0', iconClass)} aria-hidden="true" />
              <span className="min-w-0 break-words">{a.text}</span>
            </span>
            {canEdit && item && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-9 max-w-full"
                aria-label={
                  added ? `"${item.itemName}" đã có trong checklist` : `Thêm "${item.itemName}" vào checklist`
                }
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
                {added ? 'Đã có' : 'Checklist'}
              </Button>
            )}
          </li>
        )
      })}
    </ul>
  )
}
