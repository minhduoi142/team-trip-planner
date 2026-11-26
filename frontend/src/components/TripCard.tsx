import { MapPin, Users } from 'lucide-react'
import { Link } from 'react-router'
import { AvatarGroup, AvatarGroupCount } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDateRange } from '@/lib/date'
import type { TripSummaryResponse } from '@/types/trip'
import { CountdownLabel } from './CountdownLabel'
import { StatusBadge } from './StatusBadge'
import { TripCover } from './TripCover'
import { UserAvatar } from './UserAvatar'

export function TripCard({ trip }: { trip: TripSummaryResponse }) {
  const officialRange = formatDateRange(trip.startDate, trip.endDate)
  const plannedRange = formatDateRange(trip.plannedStartDate, trip.plannedEndDate)
  const hiddenCount = trip.memberCount - trip.previewMembers.length

  return (
    <Link
      to={`/trips/${trip.id}`}
      className="group block overflow-hidden rounded-surface border border-border/60 bg-card shadow-raised transition-[transform,box-shadow] duration-200 ease-out focus-visible:ring-3 focus-visible:ring-ring focus-visible:outline-none [@media(hover:hover)]:hover:-translate-y-0.5 [@media(hover:hover)]:hover:shadow-overlay"
    >
      <TripCover coverImageUrl={trip.coverImageUrl} seed={trip.id} withOverlay className="h-44">
        <div className="flex h-full flex-col justify-between p-4">
          <StatusBadge status={trip.status} className="self-start" />
          <div className="min-w-0 text-white">
            <h3 className="line-clamp-2 text-xl leading-tight font-bold break-words drop-shadow-md">{trip.title}</h3>
            {trip.destination && (
              <p className="mt-1 flex min-w-0 items-center gap-1.5 text-sm font-medium text-white/95 drop-shadow-sm">
                <MapPin className="size-3.5 shrink-0" />
                <span className="truncate">{trip.destination}</span>
              </p>
            )}
          </div>
        </div>
      </TripCover>

      <div className="flex items-center justify-between gap-3 bg-card p-4">
        <div className="min-w-0 space-y-1.5">
          <CountdownLabel trip={trip} />
          {(officialRange ?? plannedRange) && (
            <p className="truncate text-xs font-medium text-muted-foreground">
              {officialRange ?? `Dự kiến: ${plannedRange}`}
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="sr-only">{trip.memberCount} thành viên</span>
          <AvatarGroup aria-hidden="true">
            {trip.previewMembers.map((m) => (
              <UserAvatar key={m.userId} userId={m.userId} name={m.displayName} avatarUrl={m.avatarUrl} size="sm" />
            ))}
            {hiddenCount > 0 && (
              <AvatarGroupCount className="size-6 border border-card text-xs">+{hiddenCount}</AvatarGroupCount>
            )}
          </AvatarGroup>
          {trip.memberCount === 0 && <Users className="size-4 text-muted-foreground" />}
        </div>
      </div>
    </Link>
  )
}

export function TripCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-surface border border-border/60 bg-card shadow-raised">
      <Skeleton className="h-44 rounded-none" />
      <div className="flex items-center justify-between gap-3 p-4">
        <div className="space-y-2">
          <Skeleton className="h-6 w-28 rounded-full" />
          <Skeleton className="h-3 w-24 rounded-full" />
        </div>
        <div className="flex -space-x-2">
          <Skeleton className="size-6 rounded-full" />
          <Skeleton className="size-6 rounded-full" />
          <Skeleton className="size-6 rounded-full" />
        </div>
      </div>
    </div>
  )
}
