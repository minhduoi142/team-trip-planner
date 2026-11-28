package com.tripplanner.expense;

import com.tripplanner.bank.BankAccountResponse;
import com.tripplanner.expense.ExpenseEnums.SettlementKind;
import com.tripplanner.expense.ExpenseEnums.SettlementStatus;
import com.tripplanner.expense.dto.ExpenseDtos.CategoryTotalResponse;
import com.tripplanner.expense.dto.ExpenseDtos.ExpenseResponse;
import com.tripplanner.expense.dto.ExpenseDtos.ExpenseSummaryResponse;
import com.tripplanner.expense.dto.ExpenseDtos.FundMemberResponse;
import com.tripplanner.expense.dto.ExpenseDtos.FundResponse;
import com.tripplanner.expense.dto.ExpenseDtos.MemberBalanceResponse;
import com.tripplanner.expense.dto.ExpenseDtos.SettlementResponse;
import com.tripplanner.expense.dto.ExpenseDtos.ShareResponse;
import com.tripplanner.expense.dto.ExpenseDtos.TransferResponse;
import com.tripplanner.trip.TripMember;
import com.tripplanner.trip.TripMemberRepository;
import com.tripplanner.trip.TripRole;
import java.util.ArrayList;
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
    private final TripFundRepository fundRepository;

    ExpenseSummaryResponse build(Long tripId, TripMember me) {
        Long myId = me.getId().getUserId();
        boolean isOwner = me.getRole() == TripRole.OWNER;

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
        Map<String, Long> pendingByPair = pendingByPair(settlements);
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
                        canEdit(e, myId, isOwner),
                        sharesByExpense.getOrDefault(e.getId(), List.of()).stream()
                                .sorted(Comparator.comparing(s -> s.getId().getUserId()))
                                .map(s -> new ShareResponse(s.getId().getUserId(), s.getAmount()))
                                .toList(),
                        e.isFromFund()))
                .toList();

        return new ExpenseSummaryResponse(
                total,
                byCategory.entrySet().stream()
                        .sorted(Map.Entry.<ExpenseEnums.Category, Long>comparingByValue().reversed())
                        .map(entry -> new CategoryTotalResponse(entry.getKey(), entry.getValue()))
                        .toList(),
                memberRows,
                balance.suggestions().stream()
                        .map(t -> new TransferResponse(t.fromUserId(), t.toUserId(), t.amount(),
                                Math.min(t.amount(), pendingByPair.getOrDefault(pairKey(t.fromUserId(), t.toUserId()), 0L))))
                        .toList(),
                settlements.stream()
                        .map(s -> new SettlementResponse(s.getId(), s.getFromUser().getId(), s.getToUser().getId(),
                                s.getAmount(), s.getStatus(), s.getCreatedAt(), s.getConfirmedAt(), s.getKind()))
                        .toList(),
                expenseRows,
                fundRepository.findWithTreasurer(tripId)
                        .map(f -> fund(f, members, expenses, settlements, myId, isOwner))
                        .orElse(null));
    }

    /**
     * Tình trạng quỹ (docs/sdd-trip-fund.md 1.2): phần của thủ quỹ coi như đã nộp đủ (tiền nằm sẵn ở họ);
     * số dư = đã thu (gồm phần thủ quỹ) − đã chi từ quỹ. Không lưu gì.
     */
    static FundResponse fund(TripFund fund, List<TripMember> members, List<Expense> expenses,
                             List<Settlement> settlements, Long myId, boolean isOwner) {
        Long treasurerId = fund.getTreasurer().getId();
        long target = fund.getPerPersonTarget();
        Map<Long, Long> confirmedBy = new HashMap<>();
        Map<Long, Long> pendingBy = new HashMap<>();
        for (Settlement s : settlements) {
            if (s.getKind() != SettlementKind.FUND) {
                continue;
            }
            Map<Long, Long> bucket = s.getStatus() == SettlementStatus.CONFIRMED ? confirmedBy : pendingBy;
            bucket.merge(s.getFromUser().getId(), s.getAmount(), Long::sum);
        }
        long spent = expenses.stream().filter(Expense::isFromFund).mapToLong(Expense::getAmount).sum();

        long totalContributed = 0;
        long totalPending = 0;
        List<FundMemberResponse> rows = new ArrayList<>();
        for (TripMember m : members) {
            Long id = m.getUser().getId();
            boolean treasurer = id.equals(treasurerId);
            long contributed = treasurer ? target : confirmedBy.getOrDefault(id, 0L);
            long pending = treasurer ? 0 : pendingBy.getOrDefault(id, 0L);
            totalContributed += contributed;
            totalPending += pending;
            rows.add(new FundMemberResponse(id, contributed, pending, Math.max(0, target - contributed - pending),
                    treasurer));
        }
        boolean inUse = !confirmedBy.isEmpty() || !pendingBy.isEmpty() || spent > 0;
        return new FundResponse(treasurerId, target, fund.getNote(), totalContributed, totalPending, spent,
                totalContributed - spent, rows, inUse, isOwner, isOwner || treasurerId.equals(myId));
    }

    /** Tổng tiền các lần chuyển còn PENDING theo cặp (người chuyển, người nhận). */
    static Map<String, Long> pendingByPair(List<Settlement> settlements) {
        Map<String, Long> result = new HashMap<>();
        for (Settlement s : settlements) {
            // Nộp quỹ đang chờ không phải "đang trả nợ" theo gợi ý
            if (s.getStatus() == SettlementStatus.PENDING && s.getKind() == SettlementKind.DEBT) {
                result.merge(pairKey(s.getFromUser().getId(), s.getToUser().getId()), s.getAmount(), Long::sum);
            }
        }
        return result;
    }

    private static String pairKey(Long fromUserId, Long toUserId) {
        return fromUserId + ">" + toUserId;
    }

    /** Sửa/xóa khoản chi: người tạo, người trả hoặc Trưởng nhóm (OWNER). EDITOR thường không sửa được khoản người khác. */
    static boolean canEdit(Expense e, Long userId, boolean isOwner) {
        return isOwner
                || e.getPaidBy().getId().equals(userId)
                || (e.getCreatedBy() != null && e.getCreatedBy().getId().equals(userId));
    }
}
