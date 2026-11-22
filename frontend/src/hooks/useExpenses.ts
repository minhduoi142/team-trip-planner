import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { expenseApi } from '@/api/expense'
import type { ExpenseRequest, ExpenseSummaryResponse, SettlementRequest } from '@/types/expense'
import { tripKeys } from './useTrips'

export function useExpenses(tripId: number) {
  return useQuery({ queryKey: tripKeys.expenses(tripId), queryFn: () => expenseApi.summary(tripId) })
}

function useExpenseMutation<TVars>(tripId: number, fn: (vars: TVars) => Promise<ExpenseSummaryResponse>) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: (data) => qc.setQueryData(tripKeys.expenses(tripId), data),
  })
}

export function useCreateExpense(tripId: number) {
  return useExpenseMutation(tripId, (body: ExpenseRequest) => expenseApi.create(tripId, body))
}

export function useUpdateExpense(tripId: number) {
  return useExpenseMutation(tripId, ({ id, body }: { id: number; body: ExpenseRequest }) =>
    expenseApi.update(id, body),
  )
}

export function useDeleteExpense(tripId: number) {
  return useExpenseMutation(tripId, (id: number) => expenseApi.remove(id))
}

export function useCreateSettlement(tripId: number) {
  return useExpenseMutation(tripId, (body: SettlementRequest) => expenseApi.createSettlement(tripId, body))
}

export function useConfirmSettlement(tripId: number) {
  return useExpenseMutation(tripId, (id: number) => expenseApi.confirmSettlement(id))
}

export function useDeleteSettlement(tripId: number) {
  return useExpenseMutation(tripId, (id: number) => expenseApi.deleteSettlement(id))
}
