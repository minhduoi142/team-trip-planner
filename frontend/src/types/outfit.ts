import type { IsoInstant } from './api'

/** com.tripplanner.outfit.dto.OutfitDtos.OutfitRequest: gửi đủ trường (thay toàn bộ outfit) */
export interface OutfitRequest {
  /** 0..4 link ảnh, theo thứ tự hiển thị */
  photoUrls: string[]
  /** 0..3 key của bảng màu dress code (lib/dressColors.ts) */
  colors: string[]
  note: string | null
}

/** com.tripplanner.outfit.dto.OutfitDtos.OutfitResponse */
export interface OutfitResponse {
  userId: number
  displayName: string
  avatarUrl: string | null
  photoUrls: string[]
  colors: string[]
  note: string | null
  updatedAt: IsoInstant
  mine: boolean
  /** Của mình, hoặc mình là OWNER */
  canDelete: boolean
}

/** com.tripplanner.outfit.dto.OutfitDtos.DayOutfitsResponse: outfit của mình đứng đầu, rồi mới sửa trước */
export interface DayOutfitsResponse {
  dayId: number
  dayIndex: number
  outfits: OutfitResponse[]
}

/** com.tripplanner.outfit.dto.OutfitDtos.OutfitBoardResponse: mọi ngày theo dayIndex */
export interface OutfitBoardResponse {
  days: DayOutfitsResponse[]
}
