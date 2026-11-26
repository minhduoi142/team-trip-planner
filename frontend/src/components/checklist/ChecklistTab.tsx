import { ChevronDown, HandHelping, ListChecks, Pencil, Plus, SearchX, Trash2, Undo2 } from 'lucide-react'
import { useId, useState, type FormEvent, type ReactNode } from 'react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { UserAvatar } from '@/components/UserAvatar'
import { ChoiceChips } from '@/components/common/ChoiceChips'
import { RowMenuButton } from '@/components/common/layout'
import { EmptyState, TabErrorState, TabSkeleton } from '@/components/common/states'
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

  if (checklist.isPending) return <TabSkeleton variant="form+list" />
  if (checklist.isError) return <TabErrorState error={checklist.error} onRetry={() => checklist.refetch()} />

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

  const renderItem = (item: ChecklistItemResponse) => (
    <ChecklistRow
      key={item.id}
      item={item}
      myUserId={myUserId}
      canEdit={canEdit}
      claimPending={claim.isPending && claim.variables === item.id}
      onCheck={(checked) => check.mutate({ itemId: item.id, checked }, { onError })}
      onClaim={() =>
        claim.mutate(item.id, {
          onSuccess: () => toast.success(`Bạn mang "${item.itemName}"`),
          onError,
        })
      }
      onUnclaim={() => unclaim.mutate(item.id, { onError })}
      onEdit={() => setEditing(item)}
      onDelete={() => setToDelete(item)}
    />
  )

  return (
    <div className="grid gap-4">
      {data.total > 0 && (
        <Card className="py-0">
          <CardContent className="grid gap-3 p-5 sm:p-6">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-base font-bold text-foreground tabular-nums">
                {data.checked}/{data.total} món đã sẵn sàng
              </p>
              {data.unassigned > 0 && (
                <p className="rounded-full bg-warning-soft px-2.5 py-1 text-xs font-semibold text-warning-soft-foreground">
                  {data.unassigned} món chưa ai nhận
                </p>
              )}
            </div>
            <Progress value={percent} aria-label="Tiến độ chuẩn bị" className="h-3" />
          </CardContent>
        </Card>
      )}

      {canEdit && (
        <form onSubmit={addItem} className="flex flex-wrap gap-2 sm:flex-nowrap">
          <Input
            placeholder="Thêm món… (VD: Loa)"
            maxLength={150}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            aria-label="Tên món mới"
            className="min-w-0 basis-full sm:flex-1 sm:basis-auto"
          />
          <Select value={newCategory} onValueChange={(v) => setNewCategory(v as ChecklistCategory)}>
            <SelectTrigger className="min-w-0 flex-1 sm:w-40 sm:flex-none" aria-label="Nhóm đồ">
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
          <Button type="submit" size="icon" aria-label="Thêm món" disabled={!newName.trim() || create.isPending}>
            <Plus />
          </Button>
        </form>
      )}

      {data.total > 0 && <ChoiceChips label="Lọc món" options={FILTERS} value={filter} onChange={setFilter} />}

      {data.total === 0 ? (
        <EmptyState
          icon={ListChecks}
          title="Chưa có món nào"
          description={
            canEdit ? 'Thêm những thứ cả nhóm cần mang ở ô phía trên.' : 'Trưởng nhóm sẽ thêm những thứ cần mang.'
          }
        />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title="Không có món nào khớp bộ lọc"
          action={
            <Button variant="outline" onClick={() => setFilter('all')}>
              Xem tất cả
            </Button>
          }
        />
      ) : (
        CHECKLIST_CATEGORIES.map((category) => {
          const items = visible.filter((i) => i.category === category.value)
          if (items.length === 0) return null
          const todo = items.filter((i) => !i.checked)
          const done = items.filter((i) => i.checked)
          return (
            <section key={category.value} className="grid gap-2" aria-label={category.label}>
              <h3 className="flex items-center gap-2 px-1 text-sm font-bold text-foreground">
                <category.icon className="size-4 text-primary-strong" aria-hidden="true" />
                {category.label}
                <span className="text-xs font-medium text-muted-foreground tabular-nums">
                  ({done.length}/{items.length})
                </span>
              </h3>
              <Card className="py-0">
                {todo.length > 0 && <ul className="divide-y divide-border">{todo.map(renderItem)}</ul>}
                {done.length > 0 && (
                  <DoneGroup count={done.length} bordered={todo.length > 0}>
                    {done.map(renderItem)}
                  </DoneGroup>
                )}
              </Card>
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

/** Món đã xong gom lại, mặc định thu gọn (P3-CL-01). */
function DoneGroup({ count, bordered, children }: { count: number; bordered: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const id = useId()
  return (
    <div className={cn(bordered && 'border-t border-border')}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((v) => !v)}
        className="flex min-h-11 w-full items-center gap-2 px-4 text-left text-sm font-medium text-muted-foreground outline-none hover:bg-muted/40 focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-inset"
      >
        <ChevronDown className={cn('size-4 transition-transform', !open && '-rotate-90')} aria-hidden="true" />
        Đã xong ({count})
      </button>
      <ul id={id} hidden={!open} className="divide-y divide-border border-t border-border">
        {children}
      </ul>
    </div>
  )
}

function ChecklistRow({
  item,
  myUserId,
  canEdit,
  claimPending,
  onCheck,
  onClaim,
  onUnclaim,
  onEdit,
  onDelete,
}: {
  item: ChecklistItemResponse
  myUserId: number
  canEdit: boolean
  claimPending: boolean
  onCheck: (checked: boolean) => void
  onClaim: () => void
  onUnclaim: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const isMine = item.assignee?.userId === myUserId
  const canCheck = isMine || canEdit
  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <Checkbox
        checked={item.checked}
        disabled={!canCheck}
        aria-label={`Đã chuẩn bị ${item.itemName}`}
        className="size-5 rounded-full"
        onCheckedChange={(value) => onCheck(value === true)}
      />
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            'truncate text-sm font-semibold text-foreground',
            item.checked && 'font-normal text-muted-foreground line-through',
          )}
        >
          {item.itemName}
          {item.quantity > 1 && <span className="text-xs font-medium text-muted-foreground"> ×{item.quantity}</span>}
        </p>
        {item.assignee && (
          <p className="mt-0.5 flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
            <span aria-hidden="true">
              <UserAvatar
                userId={item.assignee.userId}
                name={item.assignee.displayName}
                avatarUrl={item.assignee.avatarUrl}
                size="sm"
              />
            </span>
            <span className="truncate">
              {isMine ? <b className="font-semibold text-foreground">Bạn</b> : item.assignee.displayName} mang
            </span>
          </p>
        )}
      </div>

      {!item.assignee && (
        <Button size="sm" variant="outline" className="shrink-0" disabled={claimPending} onClick={onClaim}>
          <HandHelping />
          Tôi mang
        </Button>
      )}

      {(canEdit || isMine) && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <RowMenuButton label={`Tùy chọn cho ${item.itemName}`} />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {isMine && (
              <DropdownMenuItem onSelect={onUnclaim}>
                <Undo2 />
                Bỏ nhận
              </DropdownMenuItem>
            )}
            {canEdit && (
              <>
                <DropdownMenuItem onSelect={onEdit}>
                  <Pencil />
                  Sửa
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onSelect={onDelete}>
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
}
