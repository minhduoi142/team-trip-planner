import { api } from '@/lib/api'
import type {
  AuthResponse,
  GoogleLoginRequest,
  LoginRequest,
  RegisterRequest,
  UpdateProfileRequest,
  UserResponse,
} from '@/types/auth'

export const authApi = {
  register: (body: RegisterRequest) => api.post<AuthResponse>('/auth/register', body).then((r) => r.data),
  login: (body: LoginRequest) => api.post<AuthResponse>('/auth/login', body).then((r) => r.data),
  google: (body: GoogleLoginRequest) => api.post<AuthResponse>('/auth/google', body).then((r) => r.data),
  me: () => api.get<UserResponse>('/users/me').then((r) => r.data),
  updateMe: (body: UpdateProfileRequest) => api.patch<UserResponse>('/users/me', body).then((r) => r.data),
  /** Gắn Google vào tài khoản đang đăng nhập (cùng body với đăng nhập Google) */
  linkGoogle: (body: GoogleLoginRequest) => api.put<UserResponse>('/users/me/google', body).then((r) => r.data),
  unlinkGoogle: () => api.delete<UserResponse>('/users/me/google').then((r) => r.data),
}
