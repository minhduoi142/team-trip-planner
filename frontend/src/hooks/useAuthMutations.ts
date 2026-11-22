import { useMutation } from '@tanstack/react-query'
import { authApi } from '@/api/auth'
import { useAuth } from '@/auth/useAuth'
import type { LoginRequest, RegisterRequest, UpdateProfileRequest } from '@/types/auth'

export function useLogin() {
  const { signIn } = useAuth()
  return useMutation({ mutationFn: (body: LoginRequest) => authApi.login(body), onSuccess: signIn })
}

export function useRegister() {
  const { signIn } = useAuth()
  return useMutation({ mutationFn: (body: RegisterRequest) => authApi.register(body), onSuccess: signIn })
}

export function useGoogleLogin() {
  const { signIn } = useAuth()
  return useMutation({ mutationFn: (idToken: string) => authApi.google({ idToken }), onSuccess: signIn })
}

export function useUpdateProfile() {
  const { setUser } = useAuth()
  return useMutation({ mutationFn: (body: UpdateProfileRequest) => authApi.updateMe(body), onSuccess: setUser })
}
