/** com.tripplanner.media.MediaPurpose */
export type MediaPurpose = 'TRIP_COVER' | 'AVATAR' | 'DRESS_CODE' | 'RECEIPT'

/** com.tripplanner.media.dto.MediaResponse — width/height null với WebP */
export interface MediaResponse {
  id: number
  url: string
  contentType: string
  sizeBytes: number
  width: number | null
  height: number | null
}
