/** com.tripplanner.bank.BankDirectory.Bank */
export interface BankResponse {
  bin: string
  shortName: string
  name: string
}

/** com.tripplanner.bank.BankAccountResponse */
export interface BankAccountResponse {
  bin: string
  shortName: string
  accountNo: string
  /** In hoa, không dấu */
  accountName: string
}

/** com.tripplanner.bank.BankAccountRequest */
export interface BankAccountRequest {
  bankBin: string
  accountNo: string
  accountName: string
}
