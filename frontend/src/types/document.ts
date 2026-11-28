import type { IsoInstant } from './api'

/** com.tripplanner.document.DocumentEnums.Kind (thứ tự = thứ tự chip trên form) */
export type DocumentKind = 'FLIGHT' | 'BUS_TRAIN' | 'STAY' | 'TICKET' | 'INSURANCE' | 'ID' | 'OTHER'

/** com.tripplanner.document.DocumentEnums.Visibility: PRIVATE = chỉ người tạo thấy (kể cả OWNER cũng không) */
export type DocumentVisibility = 'SHARED' | 'PRIVATE'

/** Giờ địa phương nơi đến, không múi giờ: "yyyy-MM-ddTHH:mm" (backend có thể trả kèm ":ss") */
export type LocalDateTimeString = string

/** com.tripplanner.document.dto.DocumentDtos.DocumentRequest: gửi đủ trường */
export interface DocumentRequest {
  kind: DocumentKind
  title: string
  bookingCode: string | null
  startsAt: LocalDateTimeString | null
  endsAt: LocalDateTimeString | null
  place: string | null
  contactName: string | null
  contactPhone: string | null
  note: string | null
  visibility: DocumentVisibility
}

/** com.tripplanner.document.dto.DocumentDtos.FileInfo: không có URL, tải qua GET /documents/{id}/file */
export interface FileInfo {
  type: string
  name: string
  size: number
}

/** com.tripplanner.document.dto.DocumentDtos.DocumentResponse */
export interface DocumentResponse {
  id: number
  kind: DocumentKind
  title: string
  bookingCode: string | null
  startsAt: LocalDateTimeString | null
  endsAt: LocalDateTimeString | null
  place: string | null
  contactName: string | null
  contactPhone: string | null
  note: string | null
  visibility: DocumentVisibility
  file: FileInfo | null
  createdByName: string | null
  mine: boolean
  canEdit: boolean
  updatedAt: IsoInstant
}

/** com.tripplanner.document.dto.DocumentDtos.DocumentListResponse: có giờ trước (tăng dần), không giờ sau */
export interface DocumentListResponse {
  documents: DocumentResponse[]
}
