import type { IsoDate, IsoInstant } from './api'
import type { BankAccountResponse } from './bank'

/** com.tripplanner.expense.ExpenseEnums.Category */
export type ExpenseCategory = 'FOOD' | 'TRANSPORT' | 'STAY' | 'TICKET' | 'SHOPPING' | 'OTHER'
/** com.tripplanner.expense.ExpenseEnums.SplitMode */
export type SplitMode = 'EQUAL' | 'CUSTOM'
/** com.tripplanner.expense.ExpenseEnums.SettlementStatus */
export type SettlementStatus = 'PENDING' | 'CONFIRMED'

/** com.tripplanner.expense.dto.ExpenseDtos.ShareInput */
export interface ShareInput {
  userId: number
  amount: number
}

/** com.tripplanner.expense.dto.ExpenseDtos.ExpenseRequest */
export interface ExpenseRequest {
  title: string
  category: ExpenseCategory
  amount: number
  paidBy: number
  spentOn: IsoDate | null
  splitMode: SplitMode
  /** EQUAL */
  participantIds: number[] | null
  /** CUSTOM: tổng phải bằng amount */
  shares: ShareInput[] | null
  note: string | null
  receiptUrl: string | null
}

/** com.tripplanner.expense.dto.ExpenseDtos.SettlementRequest */
export interface SettlementRequest {
  fromUserId: number
  toUserId: number
  amount: number
}

/** com.tripplanner.expense.dto.ExpenseDtos.ShareResponse */
export interface ShareResponse {
  userId: number
  amount: number
}

/** com.tripplanner.expense.dto.ExpenseDtos.ExpenseResponse */
export interface ExpenseResponse {
  id: number
  title: string
  category: ExpenseCategory
  amount: number
  paidBy: number
  spentOn: IsoDate | null
  splitMode: SplitMode
  note: string | null
  receiptUrl: string | null
  createdByName: string | null
  canEdit: boolean
  shares: ShareResponse[]
}

/** com.tripplanner.expense.dto.ExpenseDtos.MemberBalanceResponse — net > 0: được nhận, < 0: phải trả */
export interface MemberBalanceResponse {
  userId: number
  displayName: string
  avatarUrl: string | null
  paid: number
  share: number
  net: number
  bank: BankAccountResponse | null
}

/** com.tripplanner.expense.dto.ExpenseDtos.CategoryTotalResponse */
export interface CategoryTotalResponse {
  category: ExpenseCategory
  amount: number
}

/** com.tripplanner.expense.dto.ExpenseDtos.TransferResponse */
export interface TransferResponse {
  fromUserId: number
  toUserId: number
  amount: number
}

/** com.tripplanner.expense.dto.ExpenseDtos.SettlementResponse */
export interface SettlementResponse {
  id: number
  fromUserId: number
  toUserId: number
  amount: number
  status: SettlementStatus
  createdAt: IsoInstant
  confirmedAt: IsoInstant | null
}

/** com.tripplanner.expense.dto.ExpenseDtos.ExpenseSummaryResponse */
export interface ExpenseSummaryResponse {
  totalAmount: number
  byCategory: CategoryTotalResponse[]
  members: MemberBalanceResponse[]
  transfers: TransferResponse[]
  settlements: SettlementResponse[]
  expenses: ExpenseResponse[]
}
