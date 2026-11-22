import type { IsoInstant } from './api'
import type { MemberPreview } from './trip'

/** com.tripplanner.checklist.ChecklistCategory (thứ tự = thứ tự hiển thị) */
export type ChecklistCategory = 'SHARED' | 'FOOD' | 'MEDICAL' | 'ELECTRONICS' | 'PHOTO' | 'OTHER'

/** com.tripplanner.checklist.dto.ChecklistItemResponse */
export interface ChecklistItemResponse {
  id: number
  category: ChecklistCategory
  itemName: string
  quantity: number
  /** null = chưa ai nhận */
  assignee: MemberPreview | null
  checked: boolean
  createdAt: IsoInstant
}

/** com.tripplanner.checklist.dto.ChecklistResponse */
export interface ChecklistResponse {
  total: number
  checked: number
  unassigned: number
  items: ChecklistItemResponse[]
}

/** com.tripplanner.checklist.dto.ChecklistItemRequest */
export interface ChecklistItemRequest {
  itemName: string
  category: ChecklistCategory
  quantity: number | null
  assigneeId: number | null
}

/** com.tripplanner.checklist.dto.CheckRequest */
export interface CheckRequest {
  checked: boolean
}
