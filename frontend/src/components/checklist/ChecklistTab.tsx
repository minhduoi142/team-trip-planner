import { HandHelping, MoreVertical, Pencil, Plus, RotateCw, Trash2, Undo2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { UserAvatar } from '@/components/UserAvatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  useCheckItem,
  useChecklist,
  useClaimItem,
  useCreateChecklistItem,
  useDeleteChecklistItem,
  useUnclaimItem,
  useUpdateChecklistItem,
} from '@/hooks/useChecklist'
import { getErrorMessage } from '@/lib/api'
import { CHECKLIST_CATEGORIES } from '@/lib/tripContent'
import { cn } from '@/lib/utils'
import type { ChecklistCategory, ChecklistItemResponse } from '@/types/checklist'
import type { TripMemberResponse } from '@/types/trip'
import { ChecklistItemDialog } from './ChecklistItemDialog'

type Filter = 'all' | 'mine' | 'unassigned'

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'Tất cả' },
  { value: 'mine', label: 'Của tôi' },
  { value: 'unassigned', label: 'Chưa ai nhận' },
]

interface ChecklistTabProps {
  tripId: number
  myUserId: number
  canEdit: boolean
  members: TripMemberResponse[]
}

export function ChecklistTab({ tripId, myUserId, canEdit, members }: ChecklistTabProps) {
  const checklist = useChecklist(tripId)
  const create = useCreateChecklistItem(tripId)
  const update = useUpdateChecklistItem(tripId)
  const remove = useDeleteChecklistItem(tripId)
  const claim = useClaimItem(tripId)
  const unclaim = useUnclaimItem(tripId)
  const check = useCheckItem(tripId)

  const [filter, setFilter] = useState<Filter>('all')
  const [newName, setNewName] = useState('')
  const [newCategory, setNewCategory] = useState<ChecklistCategory>('SHARED')
  const [editing, setEditing] = useState<ChecklistItemResponse | null>(null)
  const [toDelete, setToDelete] = useState<ChecklistItemResponse | null>(null)

  if (checklist.isPending) {
    return (
      <div className="grid gap-3">
        <Skeleton className="h-20 rounded-3xl" />
        <Skeleton className="h-64 rounded-3xl" />
      </div>
    )
  }
  if (checklist.isError) {
    return (
      <div className="rounded-3xl border border-dashed p-8 text-center">
        <p className="text-muted-foreground">{getErrorMessage(checklist.error)}</p>
        <Button variant="outline" className="mt-4" onClick={() => checklist.refetch()}>
          <RotateCw />
          Thử lại
        </Button>
      </div>
    )
  }

  const data = checklist.data
  const onError = (error: unknown) => toast.error(getErrorMessage(error))
  const percent = data.total === 0 ? 0 : Math.round((data.checked / data.total) * 100)
  const visible = data.items.filter((item) =>
    filter === 'mine' ? item.assignee?.userId === myUserId : filter === 'unassigned' ? item.assignee === null : true,
  )

  const addItem = (event: FormEvent) => {
    event.preventDefault()
    const itemName = newName.trim()
    if (!itemName) return
    create.mutate(
      { itemName, category: newCategory, quantity: 1, assigneeId: null },
      { onSuccess: () => setNewName(''), onError },
    )
  }

  return (
    <div className="grid gap-4">
      <Card className="bg-gradient-to-br from-teal-50 to-sky-50">
        <CardContent className="grid gap-2">
          <div className="flex items-baseline justify-between">
            <p className="font-semibold">
              {data.checked}/{data.total} món đã sẵn sàng
            </p>
            <p className="text-sm text-muted-foreground">{data.unassigned} món chưa ai nhận</p>
          </div>
          <Progress value={percent} aria-label="Tiến độ chuẩn bị" />
        </CardContent>
      </Card>

      {canEdit && (
        <form onSubmit={addItem} className="flex gap-2">
          <Input
            placeholder="Thêm món cần mang… (VD: Loa bluetooth)"
            maxLength={150}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            aria-label="Tên món mới"
          />
          <Select value={newCategory} onValueChange={(v) => setNewCategory(v as ChecklistCategory)}>
            <SelectTrigger className="w-36 shrink-0" aria-label="Nhóm đồ">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CHECKLIST_CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="submit" size="icon" aria-label="Thêm" disabled={!newName.trim() || create.isPending}>
            <Plus />
          </Button>
        </form>
      )}

      <div className="flex gap-2" role="radiogroup" aria-label="Lọc">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            role="radio"
            aria-checked={filter === f.value}
            onClick={() => setFilter(f.value)}
            className={cn(
              'rounded-full px-3 py-1.5 text-sm ring-1 ring-border transition',
              filter === f.value ? 'bg-foreground text-background ring-foreground' : 'bg-card',
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="rounded-2xl bg-muted/50 px-4 py-8 text-center text-sm text-muted-foreground">
          {data.total === 0
            ? canEdit
              ? 'Chưa có món nào. Thêm những thứ cả nhóm cần mang nhé!'
              : 'Chưa có món nào trong danh sách.'
            : 'Không có món nào khớp bộ lọc.'}
        </p>
      ) : (
        CHECKLIST_CATEGORIES.map((category) => {
          const items = visible.filter((i) => i.category === category.value)
          if (items.length === 0) return null
          return (
            <section key={category.value} className="grid gap-2">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <category.icon className="size-4" />
                {category.label}
                <span className="font-normal">
                  ({items.filter((i) => i.checked).length}/{items.length})
                </span>
              </h3>
              <ul className="grid gap-2">
                {items.map((item) => {
                  const isMine = item.assignee?.userId === myUserId
                  const canCheck = isMine || canEdit
                  return (
                    <li
                      key={item.id}
                      className={cn(
                        'flex items-center gap-3 rounded-2xl bg-card px-3 py-2.5 ring-1 ring-border',
                        item.checked && 'bg-emerald-50/60',
                      )}
                    >
                      <Checkbox
                        checked={item.checked}
                        disabled={!canCheck}
                        aria-label={`Đã chuẩn bị ${item.itemName}`}
                        className="size-5"
                        onCheckedChange={(value) =>
                          check.mutate({ itemId: item.id, checked: value === true }, { onError })
                        }
                      />
                      <div className="min-w-0 flex-1">
                        <p className={cn('truncate font-medium', item.checked && 'text-muted-foreground line-through')}>
                          {item.itemName}
                          {item.quantity > 1 && <span className="font-normal text-muted-foreground"> ×{item.quantity}</span>}
                        </p>
                      </div>

                      {item.assignee ? (
                        <span className="flex shrink-0 items-center gap-1.5 text-sm">
                          <UserAvatar
                            userId={item.assignee.userId}
                            name={item.assignee.displayName}
                            avatarUrl={item.assignee.avatarUrl}
                            size="sm"
                          />
                          <span className="hidden max-w-24 truncate sm:inline">{isMine ? 'Bạn' : item.assignee.displayName}</span>
                        </span>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="shrink-0"
                          disabled={claim.isPending}
                          onClick={() =>
                            claim.mutate(item.id, { onSuccess: () => toast.success(`Bạn mang "${item.itemName}" nha 🙌`), onError })
                          }
                        >
                          <HandHelping />
                          Tôi mang
                        </Button>
                      )}

                      {(canEdit || isMine) && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon-sm" aria-label={`Tùy chọn ${item.itemName}`}>
                              <MoreVertical />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {isMine && (
                              <DropdownMenuItem onSelect={() => unclaim.mutate(item.id, { onError })}>
                                <Undo2 />
                                Bỏ nhận
                              </DropdownMenuItem>
                            )}
                            {canEdit && (
                              <>
                                <DropdownMenuItem onSelect={() => setEditing(item)}>
                                  <Pencil />
                                  Sửa
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem variant="destructive" onSelect={() => setToDelete(item)}>
                                  <Trash2 />
                                  Xóa
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </li>
                  )
                })}
              </ul>
            </section>
          )
        })
      )}

      <ChecklistItemDialog
        item={editing}
        members={members}
        pending={update.isPending}
        onOpenChange={(open) => !open && setEditing(null)}
        onSubmit={async (body) => {
          if (!editing) return
          await update.mutateAsync({ itemId: editing.id, body })
          setEditing(null)
          toast.success('Đã lưu')
        }}
      />
      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(open) => !open && setToDelete(null)}
        title="Xóa món này?"
        description={toDelete ? `"${toDelete.itemName}" sẽ bị xóa khỏi danh sách chuẩn bị.` : ''}
        confirmLabel="Xóa"
        destructive
        pending={remove.isPending}
        onConfirm={() =>
          toDelete &&
          remove.mutate(toDelete.id, {
            onSuccess: () => setToDelete(null),
            onError,
          })
        }
      />
    </div>
  )
}
