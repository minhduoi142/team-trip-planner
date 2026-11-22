package com.tripplanner.expense.dto;

import com.tripplanner.bank.BankAccountResponse;
import com.tripplanner.expense.ExpenseEnums.Category;
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
            String receiptUrl) {
    }

    public record SettlementRequest(
            @NotNull(message = "Thiếu người chuyển") Long fromUserId,
            @NotNull(message = "Thiếu người nhận") Long toUserId,
            @NotNull(message = "Chưa nhập số tiền")
            @Min(value = 1, message = "Số tiền phải lớn hơn 0")
            @Max(value = 1_000_000_000L, message = "Số tiền tối đa 1 tỷ")
            Long amount) {
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
            List<ShareResponse> shares) {
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

    public record TransferResponse(Long fromUserId, Long toUserId, long amount) {
    }

    public record SettlementResponse(
            Long id,
            Long fromUserId,
            Long toUserId,
            long amount,
            SettlementStatus status,
            Instant createdAt,
            Instant confirmedAt) {
    }

    public record ExpenseSummaryResponse(
            long totalAmount,
            List<CategoryTotalResponse> byCategory,
            List<MemberBalanceResponse> members,
            List<TransferResponse> transfers,
            List<SettlementResponse> settlements,
            List<ExpenseResponse> expenses) {
    }
}
