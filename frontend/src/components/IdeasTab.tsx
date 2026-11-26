import { Lightbulb, Vote } from 'lucide-react'
import { useState } from 'react'
import { PollsTab } from '@/components/polls/PollsTab'
import { ProposalsPanel } from '@/components/proposals/ProposalsPanel'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
    <Tabs value={view} onValueChange={(v) => setView(v as View)} className="gap-4">
      <TabsList aria-label="Ý tưởng" className="justify-self-start">
        {VIEWS.map((v) => (
          <TabsTrigger key={v.value} value={v.value} className="min-h-10 px-4">
            <v.icon />
            {v.label}
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value="wishlist">
        <ProposalsPanel tripId={tripId} myUserId={myUserId} members={members} />
      </TabsContent>
      <TabsContent value="polls">
        <PollsTab tripId={tripId} myUserId={myUserId} canCreate={canCreatePoll} members={members} />
      </TabsContent>
    </Tabs>
  )
}
