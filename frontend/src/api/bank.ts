import { api } from '@/lib/api'
import type { UserResponse } from '@/types/auth'
import type { BankAccountRequest, BankResponse } from '@/types/bank'

export const bankApi = {
  list: () => api.get<BankResponse[]>('/banks').then((r) => r.data),
  setMine: (body: BankAccountRequest) => api.put<UserResponse>('/users/me/bank', body).then((r) => r.data),
  clearMine: () => api.delete<UserResponse>('/users/me/bank').then((r) => r.data),
}
