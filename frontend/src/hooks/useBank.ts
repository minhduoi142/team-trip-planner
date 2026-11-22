import { useMutation, useQuery } from '@tanstack/react-query'
import { bankApi } from '@/api/bank'
import { useAuth } from '@/auth/useAuth'
import type { BankAccountRequest } from '@/types/bank'

/** Danh sách ngân hàng cố định ở backend → cache lâu. */
export function useBanks() {
  return useQuery({ queryKey: ['banks'], queryFn: bankApi.list, staleTime: Infinity })
}

export function useSetMyBank() {
  const { setUser } = useAuth()
  return useMutation({ mutationFn: (body: BankAccountRequest) => bankApi.setMine(body), onSuccess: setUser })
}

export function useClearMyBank() {
  const { setUser } = useAuth()
  return useMutation({ mutationFn: () => bankApi.clearMine(), onSuccess: setUser })
}
