import { Backpack, Lock, Pencil, Plus, Trash2 } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { RowMenuButton } from '@/components/common/layout'
import { EmptyState, TabErrorState, TabSkeleton } from '@/components/common/states'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useOutfits } from '@/hooks/useOutfits'
import {
  useAddPackingItem,
  useAddPackingTemplate,
  useDeletePackingItem,
  usePacking,
  usePackingTemplates,
  useSetPacked,
  useUpdatePackingItem,
} from '@/hooks/usePacking'
import { useTripWeather } from '@/hooks/useWeather'
import { getErrorMessage } from '@/lib/api'
import { PACKING_CATEGORIES, packingKey, packingSuggestions, type PackingSuggestion } from '@/lib/packing'
import { cn } from '@/lib/utils'
import type { PackingCategory, PackingItemResponse } from '@/types/packing'
import { PackingItemDialog } from './PackingItemDialog'
import { PackingSuggestions } from './PackingSuggestions'

/** Hành lý cá nhân (docs/sdd-packing-list.md): riêng tư, mẫu soạn sẵn, gợi ý theo thời tiết + outfit. */
export function PackingPanel({ tripId }: { tripId: number }) {
  const packing = usePacking(tripId)
  const templates = usePackingTemplates()
  const weather = useTripWeather(tripId, true)
  const outfits = useOutfits(tripId)
  const add = useAddPackingItem(tripId)
  const addTemplate = useAddPackingTemplate(tripId)
  const update = useUpdatePackingItem(tripId)
  const remove = useDeletePackingItem(tripId)
  const setPacked = useSetPacked(tripId)

  const [newName, setNewName] = useState('')
  const [newCategory, setNewCategory] = useState<PackingCategory>('CLOTHES')
  const [editing, setEditing] = useState<PackingItemResponse | null>(null)

  const items = packing.data?.items
  const suggestions = useMemo(
    () =>
      items
        ? packingSuggestions(
            items.map((i) => i.itemName),
            weather.data?.days ?? [],
            outfits.data?.days ?? [],
          )
        : [],
    [items, weather.data, outfits.data],
  )

  if (packing.isPending) return <TabSkeleton variant="form+list" />
  if (packing.isError) return <TabErrorState error={packing.error} onRetry={() => packing.refetch()} />

  const data = packing.data
  const onError = (error: unknown) => toast.error(getErrorMessage(error))
  const percent = data.total === 0 ? 0 : Math.round((data.packedCount / data.total) * 100)
  const existing = new Set(data.items.map((i) => packingKey(i.itemName)))

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const itemName = newName.trim()
    if (!itemName) return
    add.mutate({ itemName, category: newCategory, quantity: 1 }, { onSuccess: () => setNewName(''), onError })
  }

  const addFromTemplate = (key: string, label: string) =>
    addTemplate.mutate(key, {
      onSuccess: (res) => {
        const template = templates.data?.find((t) => t.key === key)
        const skipped = (template?.items.length ?? 0) - res.addedCount
        if (res.addedCount === 0) toast.info(`Đã có đủ các món "${label}"`)
        else toast.success(`Đã thêm ${res.addedCount} món${skipped > 0 ? `, bỏ qua ${skipped} món đã có` : ''}`)
      },
      onError,
    })

  const addSuggestion = (s: PackingSuggestion) =>
    add.mutateAsync({ itemName: s.itemName, category: s.category, quantity: 1 }).catch(onError)

  const templateChips = templates.data && (
    <div className="no-scrollbar -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <ul className="flex gap-2" aria-label="Thêm từ danh sách mẫu">
        {templates.data.map((t) => {
          const missing = t.items.filter((i) => !existing.has(packingKey(i.itemName))).length
          return (
            <li key={t.key} className="shrink-0">
              <Button
                variant="outline"
                size="sm"
                disabled={addTemplate.isPending || missing === 0}
                onClick={() => addFromTemplate(t.key, t.label)}
                aria-label={`Thêm mẫu ${t.label}, ${missing} món chưa có`}
              >
                <Plus />
                {t.label}
                <span className="text-muted-foreground tabular-nums">· {missing}</span>
              </Button>
            </li>
          )
        })}
      </ul>
    </div>
  )

  return (
    <div className="grid gap-4">
      <Card className="py-0">
        <CardContent className="grid gap-3 p-5 sm:p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-base font-bold text-foreground tabular-nums">
              {data.total === 0 ? 'Hành lý của bạn' : `Đã xếp ${data.packedCount}/${data.total} món`}
            </p>
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <Lock className="size-3.5" aria-hidden="true" />
              Chỉ mình bạn thấy
            </p>
          </div>
          {data.total > 0 && <Progress value={percent} aria-label="Tiến độ xếp hành lý" className="h-3" />}
        </CardContent>
      </Card>

      <form onSubmit={submit} className="flex flex-wrap gap-2 sm:flex-nowrap">
        <Input
          placeholder="Thêm món… (VD: Váy trắng)"
          maxLength={150}
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          aria-label="Tên món mới"
          className="min-w-0 basis-full sm:flex-1 sm:basis-auto"
        />
        <Select value={newCategory} onValueChange={(v) => setNewCategory(v as PackingCategory)}>
          <SelectTrigger className="min-w-0 flex-1 sm:w-44 sm:flex-none" aria-label="Nhóm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PACKING_CATEGORIES.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button type="submit" size="icon" aria-label="Thêm món" disabled={!newName.trim() || add.isPending}>
          <Plus />
        </Button>
      </form>

      {templateChips}

      <PackingSuggestions suggestions={suggestions} pending={add.isPending} onAdd={addSuggestion} />

      {data.total === 0 ? (
        <EmptyState
          icon={Backpack}
          title="Chưa có món nào"
          description="Bấm một danh sách mẫu ở trên để thêm nhanh, hoặc tự gõ từng món."
        />
      ) : (
        PACKING_CATEGORIES.map((category) => {
          const group = data.items.filter((i) => i.category === category.value)
          if (group.length === 0) return null
          const todo = group.filter((i) => !i.packed)
          const done = group.filter((i) => i.packed)
          return (
            <section key={category.value} className="grid gap-2" aria-label={category.label}>
              <h3 className="flex items-center gap-2 px-1 text-sm font-bold text-foreground">
                <category.icon className="size-4 text-primary-strong" aria-hidden="true" />
                {category.label}
                <span className="text-xs font-medium text-muted-foreground tabular-nums">
                  ({done.length}/{group.length})
                </span>
              </h3>
              <Card className="py-0">
                <ul className="divide-y divide-border">
                  {[...todo, ...done].map((item) => (
                    <PackingRow
                      key={item.id}
                      item={item}
                      onPacked={(packed) => setPacked.mutate({ itemId: item.id, packed }, { onError })}
                      onEdit={() => setEditing(item)}
                      onDelete={() => remove.mutate(item.id, { onError })}
                    />
                  ))}
                </ul>
              </Card>
            </section>
          )
        })
      )}

      <PackingItemDialog
        item={editing}
        pending={update.isPending}
        onOpenChange={(open) => !open && setEditing(null)}
        onSubmit={async (body) => {
          if (!editing) return
          await update.mutateAsync({ itemId: editing.id, body })
          setEditing(null)
          toast.success('Đã lưu')
        }}
      />
    </div>
  )
}

function PackingRow({
  item,
  onPacked,
  onEdit,
  onDelete,
}: {
  item: PackingItemResponse
  onPacked: (packed: boolean) => void
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <li className="flex items-center gap-3 px-4 py-2.5">
      <Checkbox
        checked={item.packed}
        aria-label={`Đã xếp ${item.itemName}`}
        className="size-5 rounded-full"
        onCheckedChange={(value) => onPacked(value === true)}
      />
      <p
        className={cn(
          'min-w-0 flex-1 text-sm font-semibold break-words text-foreground',
          item.packed && 'font-normal text-muted-foreground line-through',
        )}
      >
        {item.itemName}
        {item.quantity > 1 && <span className="text-xs font-medium text-muted-foreground"> ×{item.quantity}</span>}
      </p>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <RowMenuButton label={`Tùy chọn cho ${item.itemName}`} />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={onEdit}>
            <Pencil />
            Sửa
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onSelect={onDelete}>
            <Trash2 />
            Xóa
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  )
}
