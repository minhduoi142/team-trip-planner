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
      className="group block overflow-hidden rounded-[28px] bg-card shadow-clay-card border border-border/60 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:-translate-y-2 hover:shadow-clay-card-hover focus-visible:ring-3 focus-visible:ring-ring focus-visible:outline-none"
    >
        <TripCover coverImageUrl={trip.coverImageUrl} seed={trip.id} withOverlay className="h-44 rounded-t-[26px]">
          <div className="flex h-full flex-col justify-between p-4">
            <StatusBadge status={trip.status} className="self-start shadow-md" />
            <div className="text-white">
              <h3 className="line-clamp-2 text-xl leading-tight font-bold drop-shadow-md transition-transform duration-200 group-hover:translate-x-0.5">
                {trip.title}
              </h3>
              {trip.destination && (
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-white/95 font-medium drop-shadow-sm">
                    <MapPin className="size-3.5 shrink-0" />
                    {trip.destination}
                  </p>
            )}
                </div>
        </div>
        </TripCover>

            <div className="flex items-center justify-between gap-3 p-4 bg-card/90">
              <div className="min-w-0 space-y-1.5">
                <CountdownLabel trip={trip} />
                {(officialRange ?? plannedRange) && (
            <p className="truncate text-xs font-medium text-muted-foreground">
              {officialRange ?? `Dự kiến: ${plannedRange}`}
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2" aria-label={`${trip.memberCount} thành viên`}>
          <AvatarGroup>
            {trip.previewMembers.map((m) => (
              <UserAvatar key={m.userId} userId={m.userId} name={m.displayName} avatarUrl={m.avatarUrl} size="sm" />
            ))}
            {hiddenCount > 0 && (
              <AvatarGroupCount className="size-6 text-xs shadow-clay-badge border border-card">
                +{hiddenCount}
              </AvatarGroupCount>
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
                <div className="overflow-hidden rounded-[28px] bg-card shadow-clay-card border border-border/60">
                  <Skeleton className="h-44 rounded-none" />
                  <div className="space-y-3 p-4">
                    <Skeleton className="h-5 w-2/3 rounded-full" />
                    <Skeleton className="h-4 w-1/3 rounded-full" />
                  </div>
                </div>
                )
}
