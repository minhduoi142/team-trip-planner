import type { IsoInstant } from './api'
import type { ItineraryCategory, TimeOfDay } from './itinerary'

/** com.tripplanner.poll.dto.PollDtos.OptionRequest */
export interface PollOptionRequest {
  name: string
  mapsUrl: string | null
  note: string | null
}

/** com.tripplanner.poll.dto.PollDtos.CreatePollRequest */
export interface CreatePollRequest {
  title: string
  options: PollOptionRequest[] | null
}

/** com.tripplanner.poll.dto.PollDtos.AddToItinerary */
export interface AddToItinerary {
  dayId: number
  startTime: TimeOfDay | null
  category: ItineraryCategory
}

/** com.tripplanner.poll.dto.PollDtos.ClosePollRequest */
export interface ClosePollRequest {
  optionId: number
  addToItinerary: AddToItinerary | null
}

/** com.tripplanner.poll.dto.PollDtos.OptionResponse */
export interface PollOptionResponse {
  id: number
  name: string
  mapsUrl: string | null
  note: string | null
  createdByName: string | null
  voteCount: number
  voterIds: number[]
  votedByMe: boolean
  canDelete: boolean
}

/** com.tripplanner.poll.dto.PollDtos.PollResponse */
export interface PollResponse {
  id: number
  title: string
  createdByName: string | null
  createdAt: IsoInstant
  closed: boolean
  closedAt: IsoInstant | null
  winningOptionId: number | null
  canManage: boolean
  options: PollOptionResponse[]
}

/** com.tripplanner.poll.dto.PollDtos.PollListResponse */
export interface PollListResponse {
  polls: PollResponse[]
}
