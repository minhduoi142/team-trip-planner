package com.tripplanner.expense;

import com.tripplanner.bank.BankAccountResponse;
import com.tripplanner.expense.ExpenseEnums.SettlementStatus;
import com.tripplanner.expense.dto.ExpenseDtos.CategoryTotalResponse;
import com.tripplanner.expense.dto.ExpenseDtos.ExpenseResponse;
import com.tripplanner.expense.dto.ExpenseDtos.ExpenseSummaryResponse;
import com.tripplanner.expense.dto.ExpenseDtos.MemberBalanceResponse;
import com.tripplanner.expense.dto.ExpenseDtos.SettlementResponse;
import com.tripplanner.expense.dto.ExpenseDtos.ShareResponse;
import com.tripplanner.expense.dto.ExpenseDtos.TransferResponse;
import com.tripplanner.trip.TripMember;
import com.tripplanner.trip.TripMemberRepository;
import com.tripplanner.trip.TripRole;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/** Dựng ExpenseSummaryResponse (4 query: members, expenses, shares, settlements — không N+1). */
@Component
@RequiredArgsConstructor
class ExpenseSummaryBuilder {

    private final TripMemberRepository memberRepository;
    private final ExpenseRepository expenseRepository;
    private final ExpenseShareRepository shareRepository;
    private final SettlementRepository settlementRepository;

    ExpenseSummaryResponse build(Long tripId, TripMember me) {
        Long myId = me.getId().getUserId();
        boolean isEditor = me.getRole().atLeast(TripRole.EDITOR);

        List<TripMember> members = memberRepository.findAllWithUserByTripId(tripId);
        List<Expense> expenses = expenseRepository.findAllByTripId(tripId);
        Map<Long, List<ExpenseShare>> sharesByExpense = expenses.isEmpty() ? Map.of()
                : shareRepository.findAllByExpenseIds(expenses.stream().map(Expense::getId).toList()).stream()
                        .collect(Collectors.groupingBy(s -> s.getId().getExpenseId()));
        List<Settlement> settlements = settlementRepository.findAllByTripId(tripId);

        Map<Long, Long> paid = new HashMap<>();
        Map<Long, Long> share = new HashMap<>();
        Map<ExpenseEnums.Category, Long> byCategory = new EnumMap<>(ExpenseEnums.Category.class);
        long total = 0;
        for (Expense e : expenses) {
            total += e.getAmount();
            paid.merge(e.getPaidBy().getId(), e.getAmount(), Long::sum);
            byCategory.merge(e.getCategory(), e.getAmount(), Long::sum);
            sharesByExpense.getOrDefault(e.getId(), List.of())
                    .forEach(s -> share.merge(s.getId().getUserId(), s.getAmount(), Long::sum));
        }
        List<BalanceCalculator.Transfer> confirmed = settlements.stream()
                .filter(s -> s.getStatus() == SettlementStatus.CONFIRMED)
                .map(s -> new BalanceCalculator.Transfer(s.getFromUser().getId(), s.getToUser().getId(), s.getAmount()))
                .toList();
        BalanceCalculator.Result balance = BalanceCalculator.calculate(
                members.stream().map(m -> m.getUser().getId()).toList(), paid, share, confirmed);

        List<MemberBalanceResponse> memberRows = members.stream()
                .map(m -> {
                    Long id = m.getUser().getId();
                    return new MemberBalanceResponse(id, m.getUser().getDisplayName(), m.getUser().getAvatarUrl(),
                            paid.getOrDefault(id, 0L), share.getOrDefault(id, 0L),
                            balance.net().getOrDefault(id, 0L), BankAccountResponse.of(m.getUser()));
                })
                .toList();

        List<ExpenseResponse> expenseRows = expenses.stream()
                .sorted(Comparator.comparing(Expense::getSpentOn, Comparator.nullsLast(Comparator.reverseOrder()))
                        .thenComparing(Expense::getCreatedAt, Comparator.reverseOrder()))
                .map(e -> new ExpenseResponse(e.getId(), e.getTitle(), e.getCategory(), e.getAmount(),
                        e.getPaidBy().getId(), e.getSpentOn(), e.getSplitMode(), e.getNote(), e.getReceiptUrl(),
                        e.getCreatedBy() == null ? null : e.getCreatedBy().getDisplayName(),
                        canEdit(e, myId, isEditor),
                        sharesByExpense.getOrDefault(e.getId(), List.of()).stream()
                                .sorted(Comparator.comparing(s -> s.getId().getUserId()))
                                .map(s -> new ShareResponse(s.getId().getUserId(), s.getAmount()))
                                .toList()))
                .toList();

        return new ExpenseSummaryResponse(
                total,
                byCategory.entrySet().stream()
                        .sorted(Map.Entry.<ExpenseEnums.Category, Long>comparingByValue().reversed())
                        .map(entry -> new CategoryTotalResponse(entry.getKey(), entry.getValue()))
                        .toList(),
                memberRows,
                balance.suggestions().stream()
                        .map(t -> new TransferResponse(t.fromUserId(), t.toUserId(), t.amount()))
                        .toList(),
                settlements.stream()
                        .map(s -> new SettlementResponse(s.getId(), s.getFromUser().getId(), s.getToUser().getId(),
                                s.getAmount(), s.getStatus(), s.getCreatedAt(), s.getConfirmedAt()))
                        .toList(),
                expenseRows);
    }

    static boolean canEdit(Expense e, Long userId, boolean isEditor) {
        return isEditor
                || e.getPaidBy().getId().equals(userId)
                || (e.getCreatedBy() != null && e.getCreatedBy().getId().equals(userId));
    }
}
