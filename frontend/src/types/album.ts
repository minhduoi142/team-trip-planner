import type { IsoInstant } from './api'

/** com.tripplanner.album.dto.AlbumDtos.PhotoResponse */
export interface AlbumPhotoResponse {
  id: number
  driveFileId: string
  viewUrl: string
  thumbnailUrl: string
  caption: string | null
  dayId: number | null
  dayIndex: number | null
  addedByName: string | null
  createdAt: IsoInstant
  canEdit: boolean
}

/** com.tripplanner.album.dto.AlbumDtos.AlbumResponse */
export interface AlbumResponse {
  folderUrl: string | null
  folderId: string | null
  folderEmbedUrl: string | null
  photos: AlbumPhotoResponse[]
}

/** com.tripplanner.album.dto.AlbumDtos.SetFolderRequest — url rỗng/null = gỡ */
export interface SetFolderRequest {
  url: string | null
}

/** com.tripplanner.album.dto.AlbumDtos.AddPhotosRequest */
export interface AddPhotosRequest {
  links: string[]
  dayId: number | null
  caption: string | null
}

/** com.tripplanner.album.dto.AlbumDtos.UpdatePhotoRequest */
export interface UpdatePhotoRequest {
  caption: string | null
  dayId: number | null
}

/** com.tripplanner.album.dto.AlbumDtos.SkippedLink */
export interface SkippedLink {
  link: string
  reason: 'INVALID' | 'DUPLICATE'
}

/** com.tripplanner.album.dto.AlbumDtos.AddPhotosResponse */
export interface AddPhotosResponse {
  album: AlbumResponse
  added: number
  skipped: SkippedLink[]
}
