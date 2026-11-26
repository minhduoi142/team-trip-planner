import { Crown, Eye, Info, LogOut, Pencil, UserMinus } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { RowMenuButton } from '@/components/common/layout'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useChangeRole, useRemoveMember, useTransferOwnership } from '@/hooks/useTrips'
import { getErrorMessage } from '@/lib/api'
import { ROLE_DESCRIPTION, ROLE_LABEL } from '@/lib/labels'
import type { TripMemberResponse, TripRole } from '@/types/trip'
import { ConfirmDialog } from './ConfirmDialog'
import { UserAvatar } from './UserAvatar'

/** Trưởng nhóm → bạn → còn lại theo tên (P3-TV-02). */
function sortMembers(members: TripMemberResponse[], currentUserId: number) {
  const rank = (m: TripMemberResponse) => (m.role === 'OWNER' ? 0 : m.userId === currentUserId ? 1 : 2)
  return [...members].sort((a, b) => rank(a) - rank(b) || a.displayName.localeCompare(b.displayName, 'vi'))
}

type PendingAction =
  { kind: 'transfer'; member: TripMemberResponse } | { kind: 'remove'; member: TripMemberResponse } | { kind: 'leave' }

interface MemberListProps {
  tripId: number
  members: TripMemberResponse[]
  currentUserId: number
  myRole: TripRole
}

export function MemberList({ tripId, members, currentUserId, myRole }: MemberListProps) {
  const navigate = useNavigate()
  const [action, setAction] = useState<PendingAction | null>(null)
  const changeRole = useChangeRole(tripId)
  const transfer = useTransferOwnership(tripId)
  const remove = useRemoveMember(tripId)
  const isOwner = myRole === 'OWNER'

  const onError = (error: unknown) => toast.error(getErrorMessage(error))

  const setRole = (member: TripMemberResponse, role: TripRole) =>
    changeRole.mutate(
      { userId: member.userId, role },
      { onSuccess: () => toast.success(`${member.displayName} giờ là "${ROLE_LABEL[role]}"`), onError },
    )

  const confirm = () => {
    if (!action) return
    const done = () => setAction(null)
    if (action.kind === 'transfer') {
      transfer.mutate(action.member.userId, {
        onSuccess: () => {
          toast.success(`Đã chuyển quyền ${ROLE_LABEL.OWNER.toLowerCase()} cho ${action.member.displayName}`)
          done()
        },
        onError,
      })
    } else if (action.kind === 'remove') {
      remove.mutate(action.member.userId, {
        onSuccess: () => {
          toast.success(`Đã mời ${action.member.displayName} ra khỏi nhóm`)
          done()
        },
        onError,
      })
    } else if (action.kind === 'leave') {
      remove.mutate(currentUserId, {
        onSuccess: () => {
          toast.success('Bạn đã rời chuyến đi')
          done()
          navigate('/trips', { replace: true })
        },
        onError,
      })
    }
  }

  const isPending = changeRole.isPending || transfer.isPending || remove.isPending

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <span>Thành viên</span>
          <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-bold text-muted-foreground">
            {members.length}
          </span>
        </CardTitle>
        {!isOwner && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-destructive"
            onClick={() => setAction({ kind: 'leave' })}
          >
            <LogOut />
            Rời nhóm
          </Button>
        )}
      </CardHeader>
      <CardContent className="grid gap-3">
        <p className="flex gap-2 text-xs text-muted-foreground">
          <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          <span>
            {ROLE_LABEL.OWNER}: {ROLE_DESCRIPTION.OWNER.toLowerCase()}. {ROLE_LABEL.EDITOR}:{' '}
            {ROLE_DESCRIPTION.EDITOR.toLowerCase()}. {ROLE_LABEL.VIEWER}: {ROLE_DESCRIPTION.VIEWER.toLowerCase()}.
          </span>
        </p>
        <ul className="divide-y divide-border" role="list">
          {sortMembers(members, currentUserId).map((member) => {
            const isMe = member.userId === currentUserId
            const canManage = isOwner && !isMe

            return (
              <li key={member.userId} className="flex min-h-14 items-center justify-between gap-2 py-2.5">
                <div className="flex min-w-0 items-center gap-3">
                  <UserAvatar
                    userId={member.userId}
                    name={member.displayName}
                    avatarUrl={member.avatarUrl}
                    size="default"
                  />
                  <p className="min-w-0 truncate text-sm font-bold text-foreground">
                    {member.displayName}
                    {isMe && <span className="ml-1.5 text-xs font-normal text-muted-foreground">(bạn)</span>}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  {member.role === 'OWNER' && (
                    <Badge variant="secondary">
                      <Crown aria-hidden="true" />
                      {ROLE_LABEL.OWNER}
                    </Badge>
                  )}
                  {member.role === 'VIEWER' && (
                    <Badge variant="outline" className="bg-muted text-muted-foreground">
                      <Eye aria-hidden="true" />
                      {ROLE_LABEL.VIEWER}
                    </Badge>
                  )}
                  {member.role === 'EDITOR' && <span className="sr-only">{ROLE_LABEL.EDITOR}</span>}

                  {canManage && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <RowMenuButton label={`Tùy chọn cho ${member.displayName}`} />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>{member.displayName}</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {member.role !== 'EDITOR' && (
                          <DropdownMenuItem onSelect={() => setRole(member, 'EDITOR')}>
                            <Pencil /> Đặt làm {ROLE_LABEL.EDITOR}
                          </DropdownMenuItem>
                        )}
                        {member.role !== 'VIEWER' && (
                          <DropdownMenuItem onSelect={() => setRole(member, 'VIEWER')}>
                            <Eye /> Đặt làm {ROLE_LABEL.VIEWER}
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onSelect={() => setAction({ kind: 'transfer', member })}>
                          <Crown /> Chuyển quyền {ROLE_LABEL.OWNER.toLowerCase()}
                        </DropdownMenuItem>
                        <DropdownMenuItem variant="destructive" onSelect={() => setAction({ kind: 'remove', member })}>
                          <UserMinus /> Mời ra khỏi nhóm
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
        {isOwner && (
          <p className="text-xs text-muted-foreground">
            {members.length > 1
              ? `Muốn rời nhóm? Chuyển quyền ${ROLE_LABEL.OWNER.toLowerCase()} cho người khác trước (menu ⋮ cạnh tên).`
              : `${ROLE_LABEL.OWNER} không thể rời nhóm khi chưa có ai để chuyển quyền.`}
          </p>
        )}
      </CardContent>

      <ConfirmDialog
        open={Boolean(action)}
        onOpenChange={(open) => !open && setAction(null)}
        title={
          action?.kind === 'transfer'
            ? `Chuyển quyền ${ROLE_LABEL.OWNER.toLowerCase()} cho ${action.member.displayName}?`
            : action?.kind === 'remove'
              ? `Mời ${action.member.displayName} ra khỏi nhóm?`
              : 'Rời chuyến đi này?'
        }
        description={
          action?.kind === 'transfer'
            ? `Bạn sẽ trở thành ${ROLE_LABEL.EDITOR} và không còn toàn quyền quản lý chuyến đi.`
            : action?.kind === 'remove'
              ? 'Thành viên này sẽ không thể xem hoặc chỉnh sửa chuyến đi nữa.'
              : 'Bạn cần được mời lại nếu muốn tham gia tiếp.'
        }
        confirmLabel={action?.kind === 'transfer' ? 'Chuyển quyền' : action?.kind === 'remove' ? 'Mời ra' : 'Rời nhóm'}
        destructive={action?.kind !== 'transfer'}
        pending={isPending}
        onConfirm={confirm}
      />
    </Card>
  )
}
