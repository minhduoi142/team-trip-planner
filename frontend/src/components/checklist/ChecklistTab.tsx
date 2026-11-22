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
        <Skeleton className="h-24 rounded-3xl" />
        <Skeleton className="h-64 rounded-3xl" />
      </div>
    )
  }
  if (checklist.isError) {
    return (
        <div className="rounded-3xl border-2 border-dashed border-rose-200/80 bg-card/80 p-8 text-center shadow-clay-card">
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
        {itemName, category: newCategory, quantity: 1, assigneeId: null },
        {onSuccess: () => setNewName(''), onError },
        )
  }

        return (
        <div className="grid gap-4">
              <Card className="rounded-[28px] border-2 border-white/80 bg-gradient-to-br from-teal-50/90 via-emerald-50/70 to-sky-50/90 shadow-clay-card">
                <CardContent className="grid gap-3 p-5 sm:p-6">
                  <div className="flex items-baseline justify-between">
                      <p className="font-bold text-foreground text-base">
                        {data.checked}/{data.total} món đã sẵn sàng
                      </p>
                      <p className="text-xs font-semibold text-emerald-800 bg-emerald-100/80 px-2.5 py-1 rounded-full border border-emerald-200 shadow-clay-badge">
                        {data.unassigned} món chưa ai nhận
                      </p>
                  </div>
                  <Progress value={percent} aria-label="Tiến độ chuẩn bị" className="h-3 shadow-clay-sunken" />
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
                    className="min-w-0 flex-1"
                  />
                  <Select value={newCategory} onValueChange={(v) => setNewCategory(v as ChecklistCategory)}>
                      <SelectTrigger className="w-36 shrink-0 rounded-full shadow-clay-card" aria-label="Nhóm đồ">
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
                      'rounded-full px-4 py-1.5 text-xs sm:text-sm font-semibold transition-all duration-200 active:scale-95 border-2',
                      filter === f.value
                        ? 'bg-gradient-to-r from-rose-500 to-rose-600 text-white border-rose-300 shadow-clay-btn-primary -translate-y-0.5'
                        : 'bg-card text-foreground border-white/70 shadow-clay-card hover:-translate-y-0.5 hover:shadow-clay-card-hover',
                    )}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {visible.length === 0 ? (
                  <p className="rounded-[28px] border-2 border-dashed border-border/80 bg-card/60 px-4 py-10 text-center text-sm font-medium text-muted-foreground shadow-clay-card">
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
                      <section key={category.value} className="grid gap-2.5">
                        <h3 className="flex items-center gap-2 text-sm font-bold text-foreground/80 px-1">
                          <category.icon className="size-4 text-rose-500" />
                          {category.label}
                            <span className="font-semibold text-xs text-muted-foreground">
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
                                  'flex items-center gap-3 rounded-[22px] border-2 border-white/80 bg-card/95 px-4 py-3 shadow-clay-card transition-all duration-300 hover:shadow-clay-card-hover',
                                  item.checked && 'bg-emerald-50/50 border-emerald-200/70 shadow-clay-sunken',
                                )}
                              >
                                <Checkbox
                                  checked={item.checked}
                                  disabled={!canCheck}
                                  aria-label={`Đã chuẩn bị ${item.itemName}`}
                                  className="size-5 rounded-full border-2 border-primary shadow-clay-badge transition-transform active:scale-90"
                                  onCheckedChange={(value) =>
                                    check.mutate({ itemId: item.id, checked: value === true }, { onError })
                                  }
                                />
                                <div className="min-w-0 flex-1">
                                    <p className={cn('truncate font-bold text-foreground text-sm', item.checked && 'text-muted-foreground line-through font-normal')}>
                                      {item.itemName}
                                      {item.quantity > 1 && <span className="font-semibold text-xs text-muted-foreground"> ×{item.quantity}</span>}
                                    </p>
                                </div>

                                {item.assignee ? (
                                    <span className="flex shrink-0 items-center gap-1.5 text-xs font-semibold">
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
                                      className="shrink-0 rounded-full border-2 border-rose-200 bg-rose-50/80 text-rose-700 shadow-clay-card hover:bg-rose-100 hover:shadow-clay-card-hover hover:-translate-y-0.5 active:translate-y-0.5"
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
                                            <Button
                                              variant="ghost"
                                              size="icon-sm"
                                              aria-label={`Tùy chọn ${item.itemName}`}
                                              className="rounded-full border border-white/70 bg-white/60 shadow-clay-badge hover:bg-white"
                                            >
                                              <MoreVertical className="size-3.5" />
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
