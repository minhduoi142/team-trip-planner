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
      className="group block overflow-hidden rounded-3xl bg-card shadow-sm ring-1 ring-border transition hover:-translate-y-0.5 hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      <TripCover coverImageUrl={trip.coverImageUrl} seed={trip.id} withOverlay className="h-40">
        <div className="flex h-full flex-col justify-between p-4">
          <StatusBadge status={trip.status} className="self-start shadow-sm" />
          <div className="text-white">
            <h3 className="line-clamp-2 text-xl leading-tight font-bold drop-shadow">{trip.title}</h3>
            {trip.destination && (
              <p className="mt-1 flex items-center gap-1 text-sm text-white/90">
                <MapPin className="size-3.5" />
                {trip.destination}
              </p>
            )}
          </div>
        </div>
      </TripCover>

      <div className="flex items-center justify-between gap-3 p-4">
        <div className="min-w-0 space-y-1">
          <CountdownLabel trip={trip} />
          {(officialRange ?? plannedRange) && (
            <p className="truncate text-xs text-muted-foreground">
              {officialRange ?? `Dự kiến: ${plannedRange}`}
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2" aria-label={`${trip.memberCount} thành viên`}>
          <AvatarGroup>
            {trip.previewMembers.map((m) => (
              <UserAvatar key={m.userId} userId={m.userId} name={m.displayName} avatarUrl={m.avatarUrl} size="sm" />
            ))}
            {hiddenCount > 0 && <AvatarGroupCount className="size-6 text-xs">+{hiddenCount}</AvatarGroupCount>}
          </AvatarGroup>
          {trip.memberCount === 0 && <Users className="size-4 text-muted-foreground" />}
        </div>
      </div>
    </Link>
  )
}

export function TripCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-3xl ring-1 ring-border">
      <Skeleton className="h-40 rounded-none" />
      <div className="space-y-2 p-4">
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-3 w-1/3" />
      </div>
    </div>
  )
}
