package com.tripplanner.bank;

import jakarta.validation.constraints.NotBlank;

/** Định dạng chi tiết (BIN có trong danh sách, STK 6–19 số, tên) kiểm ở service → INVALID_BANK_ACCOUNT. */
public record BankAccountRequest(
        @NotBlank(message = "Chưa chọn ngân hàng") String bankBin,
        @NotBlank(message = "Chưa nhập số tài khoản") String accountNo,
        @NotBlank(message = "Chưa nhập tên chủ tài khoản") String accountName) {
}
