import type { IsoDate, IsoInstant } from './api'
import type { ItineraryCategory, TimeOfDay } from './itinerary'

/** com.tripplanner.proposal.dto.ProposalDtos.ProposalRequest */
export interface ProposalRequest {
  title: string
  category: ItineraryCategory
  mapsUrl: string | null
  /** TikTok / Facebook / Instagram… */
  referenceUrl: string | null
  /** VND */
  estimatedCost: number | null
  note: string | null
}

/** com.tripplanner.proposal.dto.ProposalDtos.ScheduleProposalRequest */
export interface ScheduleProposalRequest {
  dayId: number
  startTime: TimeOfDay | null
  endTime: TimeOfDay | null
  category: ItineraryCategory
}

/** com.tripplanner.proposal.dto.ProposalDtos.ScheduledInfo */
export interface ScheduledInfo {
  itemId: number
  dayId: number
  dayIndex: number
  /** null nếu trip đã mở lại khảo sát hoặc là ngày thừa */
  date: IsoDate | null
  startTime: TimeOfDay | null
}

/** com.tripplanner.proposal.dto.ProposalDtos.ProposalResponse */
export interface ProposalResponse {
  id: number
  title: string
  category: ItineraryCategory
  mapsUrl: string | null
  referenceUrl: string | null
  /** VND */
  estimatedCost: number | null
  note: string | null
  createdByName: string | null
  createdAt: IsoInstant
  voteCount: number
  voterIds: number[]
  votedByMe: boolean
  canEdit: boolean
  canDelete: boolean
  /** null = còn trong wishlist */
  scheduled: ScheduledInfo | null
}

/** com.tripplanner.proposal.dto.ProposalDtos.ProposalListResponse */
export interface ProposalListResponse {
  canSchedule: boolean
  tripLocked: boolean
  /** Chưa lên lịch trước (nhiều tim nhất trước), đã lên lịch sau */
  proposals: ProposalResponse[]
}
