package com.tripplanner.expense;

import com.tripplanner.common.BusinessException;
import com.tripplanner.common.ErrorCode;
import com.tripplanner.expense.ExpenseEnums.SplitMode;
import com.tripplanner.expense.dto.ExpenseDtos.ExpenseRequest;
import com.tripplanner.expense.dto.ExpenseDtos.ExpenseSummaryResponse;
import com.tripplanner.expense.dto.ExpenseDtos.ShareInput;
import com.tripplanner.notification.event.ExpenseChanged;
import com.tripplanner.notification.event.ExpenseChanged.Kind;
import com.tripplanner.trip.TripAccessService;
import com.tripplanner.trip.TripMember;
import com.tripplanner.trip.TripMemberRepository;
import com.tripplanner.trip.TripRole;
import com.tripplanner.user.User;
import com.tripplanner.user.UserRepository;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

/**
 * Quyền: mọi thành viên ghi được khoản MÌNH trả; ghi hộ (người trả khác mình) chỉ Trưởng nhóm (OWNER).
 * Sửa/xóa: người tạo, người trả hoặc OWNER; khi sửa, giữ nguyên người trả cũ thì không cần OWNER.
 * Bất biến: tổng phần chia = số tiền.
 */
@Service
@RequiredArgsConstructor
public class ExpenseService {

    private final TripAccessService accessService;
    private final TripMemberRepository memberRepository;
    private final ExpenseRepository expenseRepository;
    private final ExpenseShareRepository shareRepository;
    private final UserRepository userRepository;
    private final ExpenseSummaryBuilder summaryBuilder;
    private final ApplicationEventPublisher events;

    @Transactional(readOnly = true)
    public ExpenseSummaryResponse summary(Long tripId, Long userId) {
        TripMember me = accessService.require(tripId, userId, TripRole.VIEWER);
        return summaryBuilder.build(tripId, me);
    }

    @Transactional
    public ExpenseSummaryResponse create(Long tripId, Long userId, ExpenseRequest request) {
        TripMember me = accessService.require(tripId, userId, TripRole.VIEWER);
        requireCanSetPayer(me, request.paidBy());
        Set<Long> memberIds = memberIds(tripId);
        Map<Long, Long> shares = computeShares(request, memberIds);

        Expense expense = Expense.builder()
                .trip(me.getTrip())
                .createdBy(userRepository.getReferenceById(userId))
                .build();
        apply(expense, request);
        expenseRepository.saveAndFlush(expense);
        saveShares(expense.getId(), shares);
        publish(tripId, expense, userId, Kind.CREATED, Map.of(), shares);
        return summaryBuilder.build(tripId, me);
    }

    @Transactional
    public ExpenseSummaryResponse update(Long expenseId, Long userId, ExpenseRequest request) {
        Access access = requireEditable(expenseId, userId);
        // Đổi người trả sang người khác = ghi hộ → cần OWNER; giữ nguyên người trả cũ thì được
        if (!access.expense().getPaidBy().getId().equals(request.paidBy())) {
            requireCanSetPayer(access.me(), request.paidBy());
        }
        Map<Long, Long> shares = computeShares(request, memberIds(access.tripId()));
        Map<Long, Long> oldShares = currentShares(expenseId);
        apply(access.expense(), request);
        publish(access.tripId(), access.expense(), userId, Kind.UPDATED, oldShares, shares);
        // flush thay đổi của expense, xóa phần chia cũ (và clear context) rồi ghi phần chia mới
        shareRepository.deleteAllByExpenseId(expenseId);
        saveShares(expenseId, shares);
        return summaryBuilder.build(access.tripId(), reload(access));
    }

    @Transactional
    public ExpenseSummaryResponse delete(Long expenseId, Long userId) {
        Access access = requireEditable(expenseId, userId);
        publish(access.tripId(), access.expense(), userId, Kind.DELETED, currentShares(expenseId), Map.of());
        expenseRepository.delete(access.expense());
        expenseRepository.flush();
        return summaryBuilder.build(access.tripId(), access.me());
    }

    // ---------------------------------------------------------------- helpers

    /** userId → số tiền; kiểm tra người trả + người tham gia thuộc nhóm, tổng khớp. */
    private Map<Long, Long> computeShares(ExpenseRequest request, Set<Long> memberIds) {
        if (!memberIds.contains(request.paidBy())) {
            throw new BusinessException(ErrorCode.NOT_A_MEMBER, "Người trả không ở trong nhóm");
        }
        if (request.splitMode() == SplitMode.EQUAL) {
            List<Long> participants = request.participantIds() == null ? List.of() : request.participantIds();
            if (participants.isEmpty() || new HashSet<>(participants).size() != participants.size()) {
                throw new BusinessException(ErrorCode.INVALID_SPLIT, "Chọn ít nhất 1 người tham gia (không trùng)");
            }
            requireMembers(participants, memberIds);
            return ExpenseSplitter.splitEqually(request.amount(), participants, request.paidBy());
        }
        List<ShareInput> custom = request.shares() == null ? List.of() : request.shares();
        Set<Long> users = custom.stream().map(ShareInput::userId).collect(Collectors.toSet());
        if (custom.isEmpty() || users.size() != custom.size()) {
            throw new BusinessException(ErrorCode.INVALID_SPLIT, "Nhập số tiền cho ít nhất 1 người (không trùng)");
        }
        requireMembers(users, memberIds);
        long sum = custom.stream().mapToLong(ShareInput::amount).sum();
        if (sum != request.amount()) {
            throw new BusinessException(ErrorCode.INVALID_SPLIT,
                    "Tổng các phần (" + sum + "đ) phải bằng số tiền khoản chi (" + request.amount() + "đ)");
        }
        Map<Long, Long> result = new LinkedHashMap<>();
        custom.stream()
                .filter(s -> s.amount() > 0) // phần 0đ coi như không tham gia
                .forEach(s -> result.put(s.userId(), s.amount()));
        return result;
    }

    /** userId -> phần chia hiện có trong DB (đọc trước khi sửa/xoá để email so sánh cũ/mới). */
    private Map<Long, Long> currentShares(Long expenseId) {
        return shareRepository.findAllByExpenseIds(List.of(expenseId)).stream()
                .collect(Collectors.toMap(s -> s.getId().getUserId(), ExpenseShare::getAmount));
    }

    /** Email thông báo (docs/sdd-email-notifications.md §6): listener ghi outbox lúc commit. */
    private void publish(Long tripId, Expense expense, Long actorId, Kind kind, Map<Long, Long> oldShares,
                         Map<Long, Long> newShares) {
        events.publishEvent(new ExpenseChanged(tripId, expense.getId(), actorId, kind, expense.getTitle(),
                expense.getAmount(), expense.getPaidBy().getId(), oldShares, newShares));
    }

    private void saveShares(Long expenseId, Map<Long, Long> shares) {
        shares.forEach((userId, amount) -> shareRepository.save(new ExpenseShare(expenseId, userId, amount)));
        shareRepository.flush();
    }

    private void apply(Expense expense, ExpenseRequest request) {
        expense.setTitle(request.title().trim());
        expense.setCategory(request.category());
        expense.setAmount(request.amount());
        User payer = userRepository.getReferenceById(request.paidBy());
        expense.setPaidBy(payer);
        expense.setSplitMode(request.splitMode());
        expense.setSpentOn(request.spentOn());
        expense.setNote(blankToNull(request.note()));
        expense.setReceiptUrl(blankToNull(request.receiptUrl()));
    }

    private static void requireCanSetPayer(TripMember me, Long paidBy) {
        if (!me.getId().getUserId().equals(paidBy) && me.getRole() != TripRole.OWNER) {
            throw new BusinessException(ErrorCode.FORBIDDEN,
                    "Bạn chỉ ghi được khoản do chính mình trả (ghi hộ người khác cần Trưởng nhóm)");
        }
    }

    private static void requireMembers(java.util.Collection<Long> userIds, Set<Long> memberIds) {
        if (!memberIds.containsAll(userIds)) {
            throw new BusinessException(ErrorCode.NOT_A_MEMBER, "Có người tham gia không ở trong nhóm");
        }
    }

    private Set<Long> memberIds(Long tripId) {
        return memberRepository.findAllWithUserByTripId(tripId).stream()
                .map(m -> m.getUser().getId()).collect(Collectors.toSet());
    }

    private record Access(Expense expense, Long tripId, TripMember me) {
    }

    private Access requireEditable(Long expenseId, Long userId) {
        Long tripId = expenseRepository.findTripIdByExpenseId(expenseId)
                .orElseThrow(() -> new BusinessException(ErrorCode.EXPENSE_NOT_FOUND));
        TripMember me = accessService.require(tripId, userId, TripRole.VIEWER);
        Expense expense = expenseRepository.findById(expenseId)
                .orElseThrow(() -> new BusinessException(ErrorCode.EXPENSE_NOT_FOUND));
        if (!ExpenseSummaryBuilder.canEdit(expense, userId, me.getRole() == TripRole.OWNER)) {
            throw new BusinessException(ErrorCode.FORBIDDEN,
                    "Chỉ người ghi, người trả hoặc Trưởng nhóm mới sửa/xóa được khoản chi này");
        }
        return new Access(expense, tripId, me);
    }

    /** Sau clearAutomatically, membership cũ đã detached → nạp lại để build. */
    private TripMember reload(Access access) {
        return accessService.require(access.tripId(), access.me().getId().getUserId(), TripRole.VIEWER);
    }

    private static String blankToNull(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }
}
