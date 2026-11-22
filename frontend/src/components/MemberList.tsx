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
  OWNER: 'bg-amber-100 text-amber-900 border-amber-300 shadow-clay-badge',
  EDITOR: 'bg-rose-100 text-rose-800 border-rose-300 shadow-clay-badge',
  VIEWER: 'bg-zinc-100 text-zinc-700 border-zinc-300 shadow-clay-badge',
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
          toast.success(`Đã chuyển quyền trưởng nhóm cho ${action.member.displayName}`)
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
        <Card className="rounded-[28px] shadow-clay-card border border-border/60 bg-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <span>Thành viên</span>
              <span className="rounded-full bg-muted/80 px-2.5 py-0.5 text-xs font-bold text-muted-foreground shadow-clay-badge">
                {members.length}
              </span>
            </CardTitle>
            {!isOwner && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-destructive rounded-full"
                onClick={() => setAction({ kind: 'leave' })}
              >
                <LogOut className="size-4" />
                Rời nhóm
              </Button>
            )}
          </CardHeader>
          <CardContent>
              <ul className="divide-y divide-border/40" role="list">
                {members.map((member) => {
                  const isMe = member.userId === currentUserId
                  const canManage = isOwner && !isMe

                  return (
                          <li key={member.userId} className="flex items-center justify-between py-3.5 first:pt-0 last:pb-0">
                            <div className="flex items-center gap-3 min-w-0">
                              <UserAvatar userId={member.userId} name={member.displayName} avatarUrl={member.avatarUrl} size="default" />
                              <div className="min-w-0">
                                <p className="truncate text-sm font-bold text-foreground">
                                  {member.displayName}
                                  {isMe && <span className="ml-1.5 text-xs font-normal text-muted-foreground">(bạn)</span>}
                                </p>
                                <p className="text-xs text-muted-foreground">{ROLE_DESCRIPTION[member.role]}</p>
                              </div>
                            </div>

                            <div className="flex shrink-0 items-center gap-2">
                              <Badge
                                className={cn(
                                  'rounded-full px-2.5 py-0.5 text-xs font-semibold border',
                                  ROLE_BADGE[member.role],
                                )}
                              >
                                {member.role === 'OWNER' && <Crown className="size-3 mr-1 text-amber-600 inline" />}
                                {ROLE_LABEL[member.role]}
                              </Badge>

                              {canManage && (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="size-8 rounded-full text-muted-foreground hover:text-foreground"
                                      aria-label={`Tùy chọn cho ${member.displayName}`}
                                    >
                                      <MoreVertical className="size-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuLabel>{member.displayName}</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    {member.role !== 'EDITOR' && (
                                      <DropdownMenuItem onSelect={() => setRole(member, 'EDITOR')}>
                                        <Pencil /> Đặt làm Biên tập viên
                                      </DropdownMenuItem>
                                    )}
                                    {member.role !== 'VIEWER' && (
                                      <DropdownMenuItem onSelect={() => setRole(member, 'VIEWER')}>
                                        <Eye /> Đặt làm Người xem
                                      </DropdownMenuItem>
                                    )}
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onSelect={() => setAction({ kind: 'transfer', member })}>
                                      <Crown className="text-amber-500" /> Chuyển quyền trưởng nhóm
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      variant="destructive"
                                      onSelect={() => setAction({ kind: 'remove', member })}
                                    >
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
                      </CardContent>

                      <ConfirmDialog
                        open={Boolean(action)}
                        onOpenChange={(open) => !open && setAction(null)}
                        title={
                          action?.kind === 'transfer'
                            ? `Chuyển quyền trưởng nhóm cho ${action.member.displayName}?`
                            : action?.kind === 'remove'
                              ? `Mời ${action.member.displayName} ra khỏi nhóm?`
                              : 'Rời chuyến đi này?'
                        }
                        description={
                          action?.kind === 'transfer'
                            ? 'Bạn sẽ trở thành Biên tập viên và không còn toàn quyền quản lý chuyến đi.'
                            : action?.kind === 'remove'
                              ? 'Thành viên này sẽ không thể xem hoặc chỉnh sửa chuyến đi nữa.'
                              : 'Bạn cần được mời lại nếu muốn tham gia tiếp.'
                        }
                        confirmLabel={
                          action?.kind === 'transfer'
                            ? 'Chuyển quyền'
                            : action?.kind === 'remove'
                              ? 'Mời ra'
                              : 'Rời nhóm'
                        }
                        destructive={action?.kind !== 'transfer'}
                        pending={isPending}
                        onConfirm={confirm}
                      />
                    </Card>
                  )
                }
