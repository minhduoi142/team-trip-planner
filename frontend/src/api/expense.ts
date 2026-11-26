import { api } from '@/lib/api'
import type { ExpenseRequest, ExpenseSummaryResponse, SettlementRequest } from '@/types/expense'

/** Mọi thao tác ghi trả lại toàn bộ tổng hợp chi tiêu. */
export const expenseApi = {
  summary: (tripId: number) => api.get<ExpenseSummaryResponse>(`/trips/${tripId}/expenses`).then((r) => r.data),
  create: (tripId: number, body: ExpenseRequest) =>
    api.post<ExpenseSummaryResponse>(`/trips/${tripId}/expenses`, body).then((r) => r.data),
  update: (expenseId: number, body: ExpenseRequest) =>
    api.put<ExpenseSummaryResponse>(`/expenses/${expenseId}`, body).then((r) => r.data),
  remove: (expenseId: number) => api.delete<ExpenseSummaryResponse>(`/expenses/${expenseId}`).then((r) => r.data),
  createSettlement: (tripId: number, body: SettlementRequest) =>
    api.post<ExpenseSummaryResponse>(`/trips/${tripId}/settlements`, body).then((r) => r.data),
  confirmSettlement: (id: number) => api.post<ExpenseSummaryResponse>(`/settlements/${id}/confirm`).then((r) => r.data),
  deleteSettlement: (id: number) => api.delete<ExpenseSummaryResponse>(`/settlements/${id}`).then((r) => r.data),
}
