import { Crown, Eye, LogOut, MoreVertical, Pencil, UserMinus } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
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
import { cn } from '@/lib/utils'
import type { TripMemberResponse, TripRole } from '@/types/trip'
import { ConfirmDialog } from './ConfirmDialog'
import { UserAvatar } from './UserAvatar'

const ROLE_BADGE: Record<TripRole, string> = {
  OWNER: 'bg-amber-100 text-amber-800',
  EDITOR: 'bg-rose-100 text-rose-700',
  VIEWER: 'bg-zinc-100 text-zinc-600',
}

type PendingAction =
  | { kind: 'transfer'; member: TripMemberResponse }
  | { kind: 'remove'; member: TripMemberResponse }
  | { kind: 'leave' }

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
          done()
          toast.success(`${action.member.displayName} đã trở thành trưởng nhóm`)
        },
        onError,
      })
    } else if (action.kind === 'remove') {
      remove.mutate(action.member.userId, {
        onSuccess: () => {
          done()
          toast.success(`Đã xóa ${action.member.displayName} khỏi nhóm`)
        },
        onError,
      })
    } else {
      remove.mutate(currentUserId, {
        onSuccess: () => {
          done()
          toast.success('Bạn đã rời nhóm')
          navigate('/trips', { replace: true })
        },
        onError,
      })
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Thành viên ({members.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="divide-y divide-border">
          {members.map((member) => {
            const isMe = member.userId === currentUserId
            const manageable = isOwner && !isMe
            return (
              <li key={member.userId} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                <UserAvatar userId={member.userId} name={member.displayName} avatarUrl={member.avatarUrl} size="lg" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">
                    {member.displayName}
                    {isMe && <span className="font-normal text-muted-foreground"> (bạn)</span>}
                  </p>
                  <Badge className={cn('mt-1 border-transparent', ROLE_BADGE[member.role])}>
                    {member.role === 'OWNER' && <Crown />}
                    {ROLE_LABEL[member.role]}
                  </Badge>
                </div>

                {manageable && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" aria-label={`Quản lý ${member.displayName}`}>
                        <MoreVertical />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-60">
                      <DropdownMenuLabel>Quyền của {member.displayName}</DropdownMenuLabel>
                      <DropdownMenuItem
                        disabled={member.role === 'EDITOR'}
                        onSelect={() => setRole(member, 'EDITOR')}
                      >
                        <Pencil />
                        <div>
                          <p>{ROLE_LABEL.EDITOR}</p>
                          <p className="text-xs text-muted-foreground">{ROLE_DESCRIPTION.EDITOR}</p>
                        </div>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        disabled={member.role === 'VIEWER'}
                        onSelect={() => setRole(member, 'VIEWER')}
                      >
                        <Eye />
                        <div>
                          <p>{ROLE_LABEL.VIEWER}</p>
                          <p className="text-xs text-muted-foreground">{ROLE_DESCRIPTION.VIEWER}</p>
                        </div>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onSelect={() => setAction({ kind: 'transfer', member })}>
                        <Crown />
                        Chuyển quyền trưởng nhóm
                      </DropdownMenuItem>
                      <DropdownMenuItem variant="destructive" onSelect={() => setAction({ kind: 'remove', member })}>
                        <UserMinus />
                        Xóa khỏi nhóm
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}

                {isMe && !isOwner && (
                  <Button variant="ghost" size="sm" onClick={() => setAction({ kind: 'leave' })}>
                    <LogOut />
                    Rời nhóm
                  </Button>
                )}
              </li>
            )
          })}
        </ul>
      </CardContent>

      <ConfirmDialog
        open={action !== null}
        onOpenChange={(open) => !open && setAction(null)}
        pending={transfer.isPending || remove.isPending}
        onConfirm={confirm}
        {...confirmText(action)}
      />
    </Card>
  )
}

function confirmText(action: PendingAction | null) {
  switch (action?.kind) {
    case 'transfer':
      return {
        title: `Chuyển trưởng nhóm cho ${action.member.displayName}?`,
        description: 'Bạn sẽ trở thành thành viên thường và không còn quyền quản lý nhóm.',
        confirmLabel: 'Chuyển quyền',
      }
    case 'remove':
      return {
        title: `Xóa ${action.member.displayName} khỏi nhóm?`,
        description: 'Người này có thể vào lại nếu vẫn còn link mời.',
        confirmLabel: 'Xóa khỏi nhóm',
        destructive: true,
      }
    case 'leave':
      return {
        title: 'Rời khỏi chuyến đi này?',
        description: 'Bạn sẽ không xem được chuyến đi nữa, trừ khi được mời lại.',
        confirmLabel: 'Rời nhóm',
        destructive: true,
      }
    default:
      return { title: '', description: '', confirmLabel: '' }
  }
}
