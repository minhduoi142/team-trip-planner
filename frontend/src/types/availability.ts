import type { IsoDate } from './api'

/** com.tripplanner.availability.AvailabilityStatus */
export type AvailabilityStatus = 'AVAILABLE' | 'MAYBE' | 'BUSY'

/** Giá trị của AvailabilityMatrixResponse.suggestionNote */
export type SuggestionNote = 'NO_RANGE' | 'LOCKED' | 'NO_RESPONSES' | 'RANGE_TOO_SHORT' | 'NO_MATCH'

/** com.tripplanner.availability.dto.AvailabilityMemberResponse */
export interface AvailabilityMemberResponse {
  userId: number
  displayName: string
  avatarUrl: string | null
  respondedDays: number
}

/** com.tripplanner.availability.dto.AvailabilityEntryResponse */
export interface AvailabilityEntryResponse {
  userId: number
  date: IsoDate
  status: AvailabilityStatus
}

/** com.tripplanner.availability.dto.DaySummaryResponse */
export interface DaySummaryResponse {
  date: IsoDate
  available: number
  maybe: number
  busy: number
  unknown: number
}

/** com.tripplanner.availability.dto.SuggestionResponse */
export interface SuggestionResponse {
  startDate: IsoDate
  endDate: IsoDate
  availableCount: number
  maybeCount: number
  totalMembers: number
  availableUserIds: number[]
  maybeUserIds: number[]
  unavailableUserIds: number[]
}

/** com.tripplanner.availability.dto.AvailabilityMatrixResponse */
export interface AvailabilityMatrixResponse {
  rangeStart: IsoDate | null
  rangeEnd: IsoDate | null
  tripLengthDays: number | null
  effectiveLengthDays: number
  locked: boolean
  startDate: IsoDate | null
  endDate: IsoDate | null
  members: AvailabilityMemberResponse[]
  entries: AvailabilityEntryResponse[]
  days: DaySummaryResponse[]
  suggestions: SuggestionResponse[]
  suggestionNote: SuggestionNote | null
}

/** com.tripplanner.availability.dto.UpdateAvailabilityRequest.Entry (status null = xóa) */
export interface AvailabilityEntryRequest {
  date: IsoDate
  status: AvailabilityStatus | null
}

/** com.tripplanner.availability.dto.UpdateAvailabilityRequest */
export interface UpdateAvailabilityRequest {
  entries: AvailabilityEntryRequest[]
}

/** com.tripplanner.availability.dto.TripLengthRequest */
export interface TripLengthRequest {
  days: number
}

/** com.tripplanner.tripday.dto.LockDateRequest */
export interface LockDateRequest {
  startDate: IsoDate
  endDate: IsoDate
}

/** com.tripplanner.tripday.dto.TripDayResponse */
export interface TripDayResponse {
  id: number
  dayIndex: number
  date: IsoDate
  note: string | null
}
