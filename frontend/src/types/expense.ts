import type { IsoDate, IsoInstant } from './api'
import type { BankAccountResponse } from './bank'

/** com.tripplanner.expense.ExpenseEnums.Category */
export type ExpenseCategory = 'FOOD' | 'TRANSPORT' | 'STAY' | 'TICKET' | 'SHOPPING' | 'OTHER'
/** com.tripplanner.expense.ExpenseEnums.SplitMode */
export type SplitMode = 'EQUAL' | 'CUSTOM'
/** com.tripplanner.expense.ExpenseEnums.SettlementStatus */
export type SettlementStatus = 'PENDING' | 'CONFIRMED'

/** com.tripplanner.expense.ExpenseEnums.SettlementKind: DEBT trả nợ, FUND nộp quỹ chung */
export type SettlementKind = 'DEBT' | 'FUND'

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
  /** Chi từ quỹ chung: người trả bị đặt lại là thủ quỹ (null = false) */
  fromFund: boolean | null
}

/** com.tripplanner.expense.dto.ExpenseDtos.SettlementRequest */
export interface SettlementRequest {
  fromUserId: number
  toUserId: number
  amount: number
  /** null = DEBT. FUND: người nhận phải là thủ quỹ */
  kind: SettlementKind | null
}

/** com.tripplanner.expense.dto.ExpenseDtos.FundRequest (OWNER) */
export interface FundRequest {
  treasurerId: number
  /** Tổng số tiền mỗi người cần nộp */
  perPersonTarget: number
  note: string | null
}

/**
 * com.tripplanner.expense.dto.ExpenseDtos.FundMemberResponse. Thủ quỹ: contributed = mức nộp (tiền nằm sẵn ở họ).
 * remaining = max(0, mức nộp − đã nộp − đang chờ)
 */
export interface FundMemberResponse {
  userId: number
  contributed: number
  pending: number
  remaining: number
  treasurer: boolean
}

/**
 * com.tripplanner.expense.dto.ExpenseDtos.FundResponse. balance = đã thu (gồm phần thủ quỹ) − đã chi; âm = thủ quỹ
 * đang ứng. inUse: đã có giao dịch quỹ → không đổi thủ quỹ / tắt quỹ.
 */
export interface FundResponse {
  treasurerId: number
  perPersonTarget: number
  note: string | null
  totalContributed: number
  totalPending: number
  totalSpent: number
  balance: number
  members: FundMemberResponse[]
  inUse: boolean
  /** OWNER */
  canManage: boolean
  /** Thủ quỹ hoặc OWNER: ghi được "Chi từ quỹ" */
  canSpend: boolean
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
  fromFund: boolean
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
  /** Tổng các lần chuyển PENDING cùng chiều (≤ amount): phần này đang chờ người nhận xác nhận */
  pendingAmount: number
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
  kind: SettlementKind
}

/** com.tripplanner.expense.dto.ExpenseDtos.ExpenseSummaryResponse */
export interface ExpenseSummaryResponse {
  totalAmount: number
  byCategory: CategoryTotalResponse[]
  members: MemberBalanceResponse[]
  transfers: TransferResponse[]
  settlements: SettlementResponse[]
  expenses: ExpenseResponse[]
  /** null = chưa bật quỹ chung */
  fund: FundResponse | null
}
