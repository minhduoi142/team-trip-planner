import { Lightbulb, Vote } from 'lucide-react'
import { useState } from 'react'
import { PollsTab } from '@/components/polls/PollsTab'
import { ProposalsPanel } from '@/components/proposals/ProposalsPanel'
import { cn } from '@/lib/utils'
import type { TripMemberResponse } from '@/types/trip'

interface IdeasTabProps {
  tripId: number
  myUserId: number
  /** Tạo bình chọn: EDITOR+ */
  canCreatePoll: boolean
  members: TripMemberResponse[]
}

type View = 'wishlist' | 'polls'

const VIEWS: { value: View; label: string; icon: typeof Lightbulb }[] = [
  { value: 'wishlist', label: 'Wishlist', icon: Lightbulb },
  { value: 'polls', label: 'Bình chọn', icon: Vote },
]

/** Tab "Ý tưởng": wishlist đề xuất (mặc định) + bình chọn Phase 4. */
export function IdeasTab({ tripId, myUserId, canCreatePoll, members }: IdeasTabProps) {
  const [view, setView] = useState<View>('wishlist')

  return (
    <div className="grid gap-4 animate-cascade">
      <div
        role="tablist"
        aria-label="Ý tưởng"
        className="grid grid-cols-2 gap-1 justify-self-start rounded-full border border-border/60 bg-card/90 p-1 shadow-clay-card"
      >
        {VIEWS.map((v) => (
          <button
            key={v.value}
            type="button"
            role="tab"
            aria-selected={view === v.value}
            onClick={() => setView(v.value)}
            className={cn(
              'flex items-center justify-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-semibold transition-all duration-200',
              view === v.value
                ? 'bg-gradient-to-r from-rose-500 to-rose-600 text-white shadow-clay-btn-primary'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <v.icon className="size-4" />
            {v.label}
          </button>
        ))}
      </div>

      <div key={view} className="animate-cascade">
        {view === 'wishlist' ? (
          <ProposalsPanel tripId={tripId} myUserId={myUserId} members={members} />
        ) : (
          <PollsTab tripId={tripId} myUserId={myUserId} canCreate={canCreatePoll} members={members} />
        )}
      </div>
    </div>
  )
}
