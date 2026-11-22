package com.tripplanner.expense;

import com.tripplanner.auth.CurrentUser;
import com.tripplanner.config.OpenApiConfig;
import com.tripplanner.expense.dto.ExpenseDtos.ExpenseRequest;
import com.tripplanner.expense.dto.ExpenseDtos.ExpenseSummaryResponse;
import com.tripplanner.expense.dto.ExpenseDtos.SettlementRequest;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** Mọi thao tác ghi trả lại toàn bộ tổng hợp chi tiêu của chuyến. */
@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
@Tag(name = "Expenses", description = "Chi tiêu, chia tiền, thanh toán giữa thành viên")
@SecurityRequirement(name = OpenApiConfig.BEARER)
public class ExpenseController {

    private final ExpenseService expenseService;
    private final SettlementService settlementService;

    @GetMapping("/trips/{tripId}/expenses")
    @Operation(summary = "Tổng hợp: khoản chi, số dư, gợi ý chuyển khoản, thanh toán (thành viên)")
    public ExpenseSummaryResponse summary(@AuthenticationPrincipal Jwt jwt, @PathVariable Long tripId) {
        return expenseService.summary(tripId, CurrentUser.id(jwt));
    }

    @PostMapping("/trips/{tripId}/expenses")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Ghi khoản chi (mình trả: mọi thành viên; ghi hộ người khác: EDITOR+)")
    public ExpenseSummaryResponse create(@AuthenticationPrincipal Jwt jwt, @PathVariable Long tripId,
                                         @Valid @RequestBody ExpenseRequest request) {
        return expenseService.create(tripId, CurrentUser.id(jwt), request);
    }

    @PutMapping("/expenses/{expenseId}")
    @Operation(summary = "Sửa khoản chi (người tạo / người trả / EDITOR+)")
    public ExpenseSummaryResponse update(@AuthenticationPrincipal Jwt jwt, @PathVariable Long expenseId,
                                         @Valid @RequestBody ExpenseRequest request) {
        return expenseService.update(expenseId, CurrentUser.id(jwt), request);
    }

    @DeleteMapping("/expenses/{expenseId}")
    @Operation(summary = "Xóa khoản chi (người tạo / người trả / EDITOR+)")
    public ExpenseSummaryResponse delete(@AuthenticationPrincipal Jwt jwt, @PathVariable Long expenseId) {
        return expenseService.delete(expenseId, CurrentUser.id(jwt));
    }

    @PostMapping("/trips/{tripId}/settlements")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Ghi nhận chuyển tiền: người chuyển → PENDING, người nhận → CONFIRMED")
    public ExpenseSummaryResponse createSettlement(@AuthenticationPrincipal Jwt jwt, @PathVariable Long tripId,
                                                   @Valid @RequestBody SettlementRequest request) {
        return settlementService.create(tripId, CurrentUser.id(jwt), request);
    }

    @PostMapping("/settlements/{settlementId}/confirm")
    @Operation(summary = "Người nhận xác nhận đã nhận tiền")
    public ExpenseSummaryResponse confirm(@AuthenticationPrincipal Jwt jwt, @PathVariable Long settlementId) {
        return settlementService.confirm(settlementId, CurrentUser.id(jwt));
    }

    @DeleteMapping("/settlements/{settlementId}")
    @Operation(summary = "Hủy (người chuyển khi đang chờ) hoặc từ chối/hoàn tác (người nhận)")
    public ExpenseSummaryResponse deleteSettlement(@AuthenticationPrincipal Jwt jwt, @PathVariable Long settlementId) {
        return settlementService.delete(settlementId, CurrentUser.id(jwt));
    }
}
