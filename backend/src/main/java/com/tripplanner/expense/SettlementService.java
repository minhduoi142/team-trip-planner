package com.tripplanner.expense;

import com.tripplanner.common.BusinessException;
import com.tripplanner.common.ErrorCode;
import com.tripplanner.expense.ExpenseEnums.SettlementStatus;
import com.tripplanner.expense.dto.ExpenseDtos.ExpenseSummaryResponse;
import com.tripplanner.expense.dto.ExpenseDtos.SettlementRequest;
import com.tripplanner.trip.TripAccessService;
import com.tripplanner.trip.TripMember;
import com.tripplanner.trip.TripMemberRepository;
import com.tripplanner.trip.TripRole;
import com.tripplanner.user.UserRepository;
import java.time.Instant;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Người chuyển tạo → PENDING; người nhận tạo (vd nhận tiền mặt) → CONFIRMED luôn. Người nhận xác nhận
 * PENDING → CONFIRMED. Hủy: người chuyển (khi PENDING) hoặc người nhận (bất kỳ lúc nào). Chỉ CONFIRMED tính số dư.
 */
@Service
@RequiredArgsConstructor
public class SettlementService {

    private final TripAccessService accessService;
    private final TripMemberRepository memberRepository;
    private final SettlementRepository settlementRepository;
    private final UserRepository userRepository;
    private final ExpenseSummaryBuilder summaryBuilder;

    @Transactional
    public ExpenseSummaryResponse create(Long tripId, Long userId, SettlementRequest request) {
        TripMember me = accessService.require(tripId, userId, TripRole.VIEWER);
        Long from = request.fromUserId();
        Long to = request.toUserId();
        if (from.equals(to)) {
            throw new BusinessException(ErrorCode.INVALID_SETTLEMENT, "Không thể chuyển tiền cho chính mình");
        }
        if (!userId.equals(from) && !userId.equals(to)) {
            throw new BusinessException(ErrorCode.INVALID_SETTLEMENT, "Bạn phải là người chuyển hoặc người nhận");
        }
        if (memberRepository.findMember(tripId, from).isEmpty() || memberRepository.findMember(tripId, to).isEmpty()) {
            throw new BusinessException(ErrorCode.NOT_A_MEMBER);
        }
        boolean receiverRecords = userId.equals(to);
        settlementRepository.save(Settlement.builder()
                .trip(me.getTrip())
                .fromUser(userRepository.getReferenceById(from))
                .toUser(userRepository.getReferenceById(to))
                .amount(request.amount())
                .status(receiverRecords ? SettlementStatus.CONFIRMED : SettlementStatus.PENDING)
                .confirmedAt(receiverRecords ? Instant.now() : null)
                .build());
        settlementRepository.flush();
        return summaryBuilder.build(tripId, me);
    }

    @Transactional
    public ExpenseSummaryResponse confirm(Long settlementId, Long userId) {
        Access access = require(settlementId, userId);
        Settlement s = access.settlement();
        if (!s.getToUser().getId().equals(userId) || s.getStatus() != SettlementStatus.PENDING) {
            throw new BusinessException(ErrorCode.INVALID_SETTLEMENT, "Chỉ người nhận mới xác nhận được khoản đang chờ");
        }
        s.setStatus(SettlementStatus.CONFIRMED);
        s.setConfirmedAt(Instant.now());
        return summaryBuilder.build(access.tripId(), access.me());
    }

    @Transactional
    public ExpenseSummaryResponse delete(Long settlementId, Long userId) {
        Access access = require(settlementId, userId);
        Settlement s = access.settlement();
        boolean senderCancelsPending = s.getFromUser().getId().equals(userId) && s.getStatus() == SettlementStatus.PENDING;
        boolean receiver = s.getToUser().getId().equals(userId);
        if (!senderCancelsPending && !receiver) {
            throw new BusinessException(ErrorCode.INVALID_SETTLEMENT,
                    "Chỉ người nhận, hoặc người chuyển khi còn đang chờ, mới hủy được");
        }
        settlementRepository.delete(s);
        settlementRepository.flush();
        return summaryBuilder.build(access.tripId(), access.me());
    }

    private record Access(Settlement settlement, Long tripId, TripMember me) {
    }

    private Access require(Long settlementId, Long userId) {
        Long tripId = settlementRepository.findTripIdById(settlementId)
                .orElseThrow(() -> new BusinessException(ErrorCode.SETTLEMENT_NOT_FOUND));
        TripMember me = accessService.require(tripId, userId, TripRole.VIEWER);
        Settlement s = settlementRepository.findById(settlementId)
                .orElseThrow(() -> new BusinessException(ErrorCode.SETTLEMENT_NOT_FOUND));
        return new Access(s, tripId, me);
    }
}
