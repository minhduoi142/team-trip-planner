package com.tripplanner.expense.dto;

import com.tripplanner.bank.BankAccountResponse;
import com.tripplanner.expense.ExpenseEnums.Category;
import com.tripplanner.expense.ExpenseEnums.SettlementKind;
import com.tripplanner.expense.ExpenseEnums.SettlementStatus;
import com.tripplanner.expense.ExpenseEnums.SplitMode;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

/** DTO (record) của package expense, gom 1 file. Tiền: VND số nguyên. */
public final class ExpenseDtos {

    private ExpenseDtos() {
    }

    public record ShareInput(
            @NotNull(message = "Thiếu người") Long userId,
            @NotNull(message = "Thiếu số tiền") @Min(value = 0, message = "Số tiền không được âm") Long amount) {
    }

    /**
     * EQUAL: dùng participantIds. CUSTOM: dùng shares (tổng phải bằng amount). Kiểm tra chéo ở service
     * (INVALID_SPLIT / NOT_A_MEMBER).
     */
    public record ExpenseRequest(
            @NotBlank(message = "Nội dung khoản chi không được để trống")
            @Size(max = 150, message = "Nội dung tối đa 150 ký tự")
            String title,

            @NotNull(message = "Chưa chọn loại chi") Category category,

            @NotNull(message = "Chưa nhập số tiền")
            @Min(value = 1, message = "Số tiền phải lớn hơn 0")
            @Max(value = 1_000_000_000L, message = "Số tiền tối đa 1 tỷ")
            Long amount,

            @NotNull(message = "Chưa chọn người trả") Long paidBy,

            LocalDate spentOn,

            @NotNull(message = "Chưa chọn cách chia") SplitMode splitMode,

            List<Long> participantIds,

            List<@Valid ShareInput> shares,

            @Size(max = 500, message = "Ghi chú tối đa 500 ký tự") String note,

            @Size(max = 2000, message = "Link ảnh quá dài")
            @Pattern(regexp = "^$|^https?://.+", message = "Link ảnh hóa đơn phải bắt đầu bằng http:// hoặc https://")
            String receiptUrl,

            /** Chi từ quỹ chung (null = false): người trả bị đặt lại là thủ quỹ (docs/sdd-trip-fund.md). */
            Boolean fromFund) {

        public boolean fundExpense() {
            return Boolean.TRUE.equals(fromFund);
        }

        /** Bản sao với người trả khác (chi từ quỹ → thủ quỹ). */
        public ExpenseRequest withPaidBy(Long payer) {
            return new ExpenseRequest(title, category, amount, payer, spentOn, splitMode, participantIds, shares, note,
                    receiptUrl, fromFund);
        }
    }

    public record SettlementRequest(
            @NotNull(message = "Thiếu người chuyển") Long fromUserId,
            @NotNull(message = "Thiếu người nhận") Long toUserId,
            @NotNull(message = "Chưa nhập số tiền")
            @Min(value = 1, message = "Số tiền phải lớn hơn 0")
            @Max(value = 1_000_000_000L, message = "Số tiền tối đa 1 tỷ")
            Long amount,
            /** null = DEBT (trả nợ). FUND: nộp quỹ, người nhận phải là thủ quỹ. */
            SettlementKind kind) {

        public SettlementKind kindOrDefault() {
            return kind == null ? SettlementKind.DEBT : kind;
        }
    }

    /** Bật hoặc sửa quỹ chung (OWNER). Mức nộp = tổng tiền mỗi người cần nộp, như nhau cho mọi người. */
    public record FundRequest(
            @NotNull(message = "Chưa chọn thủ quỹ") Long treasurerId,
            @NotNull(message = "Chưa nhập mức nộp")
            @Min(value = 1_000, message = "Mức nộp tối thiểu 1.000đ")
            @Max(value = 100_000_000L, message = "Mức nộp tối đa 100 triệu")
            Long perPersonTarget,
            @Size(max = 300, message = "Ghi chú tối đa 300 ký tự") String note) {
    }

    /**
     * Tình trạng nộp quỹ của 1 người. {@code contributed}: tổng nộp đã xác nhận (thủ quỹ: = mức nộp, vì tiền nằm sẵn
     * ở họ); {@code pending}: đang chờ thủ quỹ xác nhận; {@code remaining} = max(0, mức nộp − đã nộp − đang chờ).
     */
    public record FundMemberResponse(Long userId, long contributed, long pending, long remaining, boolean treasurer) {
    }

    /**
     * Quỹ chung. {@code totalContributed} đã gồm phần của thủ quỹ; {@code balance} = đã thu − đã chi (âm: thủ quỹ đang
     * ứng tiền). {@code inUse}: đã có giao dịch quỹ → không đổi thủ quỹ / tắt quỹ được. {@code canManage}: OWNER;
     * {@code canSpend}: thủ quỹ hoặc OWNER ghi được "Chi từ quỹ".
     */
    public record FundResponse(
            Long treasurerId,
            long perPersonTarget,
            String note,
            long totalContributed,
            long totalPending,
            long totalSpent,
            long balance,
            List<FundMemberResponse> members,
            boolean inUse,
            boolean canManage,
            boolean canSpend) {
    }

    public record ShareResponse(Long userId, long amount) {
    }

    public record ExpenseResponse(
            Long id,
            String title,
            Category category,
            long amount,
            Long paidBy,
            LocalDate spentOn,
            SplitMode splitMode,
            String note,
            String receiptUrl,
            String createdByName,
            boolean canEdit,
            List<ShareResponse> shares,
            boolean fromFund) {
    }

    /** net > 0: được nhận lại; net < 0: còn phải trả. {@code bank} null nếu chưa khai báo. */
    public record MemberBalanceResponse(
            Long userId,
            String displayName,
            String avatarUrl,
            long paid,
            long share,
            long net,
            BankAccountResponse bank) {
    }

    public record CategoryTotalResponse(Category category, long amount) {
    }

    /**
     * Gợi ý chuyển tiền (chỉ tính lần chuyển CONFIRMED). {@code pendingAmount} = tổng các lần chuyển PENDING cùng chiều
     * from → to (tối đa bằng {@code amount}), để FE không mời trả/nhận lại khoản đang chờ xác nhận.
     */
    public record TransferResponse(Long fromUserId, Long toUserId, long amount, long pendingAmount) {
    }

    public record SettlementResponse(
            Long id,
            Long fromUserId,
            Long toUserId,
            long amount,
            SettlementStatus status,
            Instant createdAt,
            Instant confirmedAt,
            SettlementKind kind) {
    }

    public record ExpenseSummaryResponse(
            long totalAmount,
            List<CategoryTotalResponse> byCategory,
            List<MemberBalanceResponse> members,
            List<TransferResponse> transfers,
            List<SettlementResponse> settlements,
            List<ExpenseResponse> expenses,
            /** null = chuyến chưa bật quỹ chung */
            FundResponse fund) {
    }
}
