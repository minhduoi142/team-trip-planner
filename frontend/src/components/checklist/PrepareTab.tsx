import { Backpack, ListChecks } from 'lucide-react'
import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { PackingPanel } from '@/components/packing/PackingPanel'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { TripMemberResponse } from '@/types/trip'
import { ChecklistTab } from './ChecklistTab'

type View = 'mine' | 'shared'

const STORAGE_KEY = 'tp.prepareView'

function isView(value: string | null): value is View {
  return value === 'mine' || value === 'shared'
}

/** Lần mở đầu: ?view= (link trong email) → lựa chọn lần trước (localStorage) → mặc định "Hành lý của tôi". */
function initialView(fromUrl: string | null): View {
  if (isView(fromUrl)) return fromUrl
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (isView(saved)) return saved
  } catch {
    // localStorage bị chặn (chế độ riêng tư…): dùng mặc định
  }
  return 'mine'
}

interface PrepareTabProps {
  tripId: number
  myUserId: number
  canEdit: boolean
  members: TripMemberResponse[]
}

/** Tab "Chuẩn bị": hành lý cá nhân (riêng tư, docs/sdd-packing-list.md) + đồ chung của nhóm (checklist Phase 3). */
export function PrepareTab({ tripId, myUserId, canEdit, members }: PrepareTabProps) {
  const [params] = useSearchParams()
  const [view, setView] = useState<View>(() => initialView(params.get('view')))

  const change = (next: string) => {
    if (!isView(next)) return
    setView(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // bỏ qua: chỉ là tiện ích nhớ lựa chọn
    }
  }

  return (
    <Tabs value={view} onValueChange={change} className="gap-4">
      <TabsList aria-label="Chuẩn bị" className="justify-self-start">
        <TabsTrigger value="mine" className="min-h-10 px-4">
          <Backpack />
          Hành lý của tôi
        </TabsTrigger>
        <TabsTrigger value="shared" className="min-h-10 px-4">
          <ListChecks />
          Đồ chung
        </TabsTrigger>
      </TabsList>
      <TabsContent value="mine">
        <PackingPanel tripId={tripId} />
      </TabsContent>
      <TabsContent value="shared">
        <ChecklistTab tripId={tripId} myUserId={myUserId} canEdit={canEdit} members={members} />
      </TabsContent>
    </Tabs>
  )
}
