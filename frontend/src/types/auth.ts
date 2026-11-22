import type { IsoInstant } from './api'

/** com.tripplanner.user.dto.UserResponse */
export interface UserResponse {
  id: number
  displayName: string
  username: string | null
  email: string | null
  avatarUrl: string | null
  hasGoogle: boolean
  hasPassword: boolean
}

/** com.tripplanner.auth.dto.AuthResponse */
export interface AuthResponse {
  accessToken: string
  expiresAt: IsoInstant
  user: UserResponse
}

/** com.tripplanner.auth.dto.RegisterRequest */
export interface RegisterRequest {
  username: string
  password: string
  displayName: string
}

/** com.tripplanner.auth.dto.LoginRequest */
export interface LoginRequest {
  username: string
  password: string
}

/** com.tripplanner.auth.dto.GoogleLoginRequest */
export interface GoogleLoginRequest {
  idToken: string
}

/** com.tripplanner.user.dto.UpdateProfileRequest */
export interface UpdateProfileRequest {
  displayName: string
  avatarUrl: string | null
}
