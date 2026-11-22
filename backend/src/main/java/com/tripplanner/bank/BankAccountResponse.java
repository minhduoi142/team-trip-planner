package com.tripplanner.bank;

import com.tripplanner.user.User;

/** Tài khoản nhận tiền của 1 người; dùng ở hồ sơ và ở tổng hợp chi tiêu (để tạo VietQR). */
public record BankAccountResponse(String bin, String shortName, String accountNo, String accountName) {

    /** null nếu user chưa khai báo. */
    public static BankAccountResponse of(User user) {
        if (user.getBankBin() == null) {
            return null;
        }
        String shortName = BankDirectory.find(user.getBankBin()).map(BankDirectory.Bank::shortName)
                .orElse(user.getBankBin());
        return new BankAccountResponse(user.getBankBin(), shortName, user.getBankAccountNo(), user.getBankAccountName());
    }
}
