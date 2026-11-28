import type { IsoInstant } from './api'

/** com.tripplanner.packing.PackingCategory (thứ tự = thứ tự hiển thị nhóm) */
export type PackingCategory = 'CLOTHES' | 'BEAUTY' | 'DOCUMENTS' | 'ELECTRONICS' | 'HEALTH' | 'OTHER'

/** com.tripplanner.packing.dto.PackingDtos.PackingItemRequest: quantity null = 1 */
export interface PackingItemRequest {
  itemName: string
  category: PackingCategory
  quantity: number | null
}

/** com.tripplanner.packing.dto.PackingDtos.PackingItemResponse */
export interface PackingItemResponse {
  id: number
  itemName: string
  category: PackingCategory
  quantity: number
  packed: boolean
  createdAt: IsoInstant
}

/**
 * com.tripplanner.packing.dto.PackingDtos.PackingListResponse: danh sách của chính mình, theo nhóm rồi lúc thêm.
 * addedCount: số món vừa thêm (chỉ có nghĩa với lệnh thêm từ mẫu).
 */
export interface PackingListResponse {
  items: PackingItemResponse[]
  total: number
  packedCount: number
  addedCount: number
}

/** com.tripplanner.packing.dto.PackingDtos.TemplateItemResponse */
export interface TemplateItemResponse {
  itemName: string
  category: PackingCategory
  quantity: number
}

/** com.tripplanner.packing.dto.PackingDtos.PackingTemplateResponse */
export interface PackingTemplateResponse {
  key: string
  label: string
  items: TemplateItemResponse[]
}
