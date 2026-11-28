package com.tripplanner.expense;

import com.tripplanner.common.BusinessException;
import com.tripplanner.common.ErrorCode;
import com.tripplanner.expense.dto.ExpenseDtos.ExpenseSummaryResponse;
import com.tripplanner.expense.dto.ExpenseDtos.FundRequest;
import com.tripplanner.trip.TripAccessService;
import com.tripplanner.trip.TripMember;
import com.tripplanner.trip.TripMemberRepository;
import com.tripplanner.trip.TripRole;
import com.tripplanner.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

/**
 * Bật / sửa / tắt quỹ chung (docs/sdd-trip-fund.md). Chỉ OWNER. Khi quỹ đã có giao dịch (nộp quỹ hoặc chi từ quỹ)
 * thì không đổi thủ quỹ và không tắt được nữa (FUND_IN_USE); mức nộp và ghi chú vẫn sửa được.
 */
@Service
@RequiredArgsConstructor
public class FundService {

    private final TripAccessService accessService;
    private final TripMemberRepository memberRepository;
    private final TripFundRepository fundRepository;
    private final UserRepository userRepository;
    private final ExpenseSummaryBuilder summaryBuilder;

    @Transactional
    public ExpenseSummaryResponse upsert(Long tripId, Long userId, FundRequest request) {
        TripMember me = accessService.require(tripId, userId, TripRole.OWNER);
        if (memberRepository.findMember(tripId, request.treasurerId()).isEmpty()) {
            throw new BusinessException(ErrorCode.NOT_A_MEMBER, "Thủ quỹ phải là thành viên của chuyến");
        }
        TripFund fund = fundRepository.findWithTreasurer(tripId).orElse(null);
        if (fund == null) {
            fund = TripFund.builder().tripId(tripId).build();
        } else if (!fund.getTreasurer().getId().equals(request.treasurerId()) && inUse(tripId)) {
            throw new BusinessException(ErrorCode.FUND_IN_USE);
        }
        fund.setTreasurer(userRepository.getReferenceById(request.treasurerId()));
        fund.setPerPersonTarget(request.perPersonTarget());
        fund.setNote(StringUtils.hasText(request.note()) ? request.note().trim() : null);
        fundRepository.saveAndFlush(fund);
        return summaryBuilder.build(tripId, me);
    }

    @Transactional
    public ExpenseSummaryResponse disable(Long tripId, Long userId) {
        TripMember me = accessService.require(tripId, userId, TripRole.OWNER);
        if (fundRepository.existsById(tripId)) {
            if (inUse(tripId)) {
                throw new BusinessException(ErrorCode.FUND_IN_USE);
            }
            fundRepository.deleteByTripId(tripId);
        }
        return summaryBuilder.build(tripId, me);
    }

    private boolean inUse(Long tripId) {
        return fundRepository.hasFundSettlements(tripId) || fundRepository.hasFundExpenses(tripId);
    }
}
