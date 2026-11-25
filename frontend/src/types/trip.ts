import type { IsoDate, IsoInstant } from './api'

/** com.tripplanner.trip.TripRole */
export type TripRole = 'VIEWER' | 'EDITOR' | 'OWNER'

/** com.tripplanner.trip.TripStatus */
export type TripStatus = 'PLANNING' | 'UPCOMING' | 'ONGOING' | 'COMPLETED'

/** com.tripplanner.trip.dto.TripRequest (dùng cho cả POST và PATCH) */
export interface TripRequest {
  title: string
  destination: string | null
  description: string | null
  /** URL http(s) hoặc "preset:<key>" */
  coverImageUrl: string | null
  plannedStartDate: IsoDate | null
  plannedEndDate: IsoDate | null
  /** Tọa độ điểm đến (chọn từ gợi ý /geo/search); cả hai hoặc không. null = xóa vị trí */
  destinationLat: number | null
  destinationLon: number | null
}

/** com.tripplanner.trip.dto.MemberPreview */
export interface MemberPreview {
  userId: number
  displayName: string
  avatarUrl: string | null
}

/** com.tripplanner.trip.dto.TripSummaryResponse */
export interface TripSummaryResponse {
  id: number
  title: string
  destination: string | null
  coverImageUrl: string | null
  status: TripStatus
  plannedStartDate: IsoDate | null
  plannedEndDate: IsoDate | null
  startDate: IsoDate | null
  endDate: IsoDate | null
  myRole: TripRole
  memberCount: number
  previewMembers: MemberPreview[]
}

/** com.tripplanner.trip.dto.TripMemberResponse */
export interface TripMemberResponse {
  userId: number
  displayName: string
  avatarUrl: string | null
  role: TripRole
  joinedAt: IsoInstant
}

/** com.tripplanner.trip.dto.TripDetailResponse */
export interface TripDetailResponse {
  id: number
  title: string
  destination: string | null
  /** Tọa độ điểm đến; null nếu chưa chọn vị trí từ gợi ý (khi đó không có thời tiết) */
  destinationLat: number | null
  destinationLon: number | null
  description: string | null
  coverImageUrl: string | null
  status: TripStatus
  plannedStartDate: IsoDate | null
  plannedEndDate: IsoDate | null
  startDate: IsoDate | null
  endDate: IsoDate | null
  /** null với VIEWER */
  inviteCode: string | null
  myRole: TripRole
  memberCount: number
  createdAt: IsoInstant
  /** Link thư mục Google Drive chung; null nếu chưa gắn */
  driveFolderUrl: string | null
  members: TripMemberResponse[]
}

/** com.tripplanner.trip.dto.InvitePreviewResponse */
export interface InvitePreviewResponse {
  title: string
  destination: string | null
  coverImageUrl: string | null
  status: TripStatus
  memberCount: number
  plannedStartDate: IsoDate | null
  plannedEndDate: IsoDate | null
  startDate: IsoDate | null
  endDate: IsoDate | null
}

/** com.tripplanner.trip.dto.JoinTripResponse */
export interface JoinTripResponse {
  tripId: number
  role: TripRole
  alreadyMember: boolean
}

/** com.tripplanner.trip.dto.InviteCodeResponse */
export interface InviteCodeResponse {
  inviteCode: string
}

/** com.tripplanner.trip.dto.ChangeRoleRequest */
export interface ChangeRoleRequest {
  role: TripRole
}

/** com.tripplanner.trip.dto.TransferOwnershipRequest */
export interface TransferOwnershipRequest {
  userId: number
}
