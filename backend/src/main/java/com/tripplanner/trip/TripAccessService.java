package com.tripplanner.trip;

import com.tripplanner.common.BusinessException;
import com.tripplanner.common.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Điểm kiểm tra quyền duy nhất cho mọi tài nguyên thuộc một chuyến đi. Các phase sau
 * (lịch rảnh, lịch trình, chi tiêu...) đều gọi qua đây.
 */
@Service
@RequiredArgsConstructor
public class TripAccessService {

    private final TripRepository tripRepository;
    private final TripMemberRepository memberRepository;

    /**
     * @return membership của user nếu có quyền tối thiểu {@code minRole}
     * @throws BusinessException TRIP_NOT_FOUND (404), NOT_TRIP_MEMBER (403), FORBIDDEN (403)
     */
    @Transactional(readOnly = true)
    public TripMember require(Long tripId, Long userId, TripRole minRole) {
        if (!tripRepository.existsById(tripId)) {
            throw new BusinessException(ErrorCode.TRIP_NOT_FOUND);
        }
        TripMember member = memberRepository.findMember(tripId, userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_TRIP_MEMBER));
        if (!member.getRole().atLeast(minRole)) {
            throw new BusinessException(ErrorCode.FORBIDDEN);
        }
        return member;
    }
}
