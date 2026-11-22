import type { MemberPreview } from './trip'

/** com.tripplanner.room.dto.RoomDtos.RoomRequest — capacity null = không giới hạn */
export interface RoomRequest {
  name: string
  capacity: number | null
  note: string | null
}

/** com.tripplanner.room.dto.RoomDtos.RoomResponse */
export interface RoomResponse {
  id: number
  name: string
  capacity: number | null
  note: string | null
  members: MemberPreview[]
}

/** com.tripplanner.room.dto.RoomDtos.RoomListResponse */
export interface RoomListResponse {
  rooms: RoomResponse[]
  unassigned: MemberPreview[]
}
