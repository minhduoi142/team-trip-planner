package com.tripplanner.trip;

import com.tripplanner.common.BusinessException;
import com.tripplanner.common.ErrorCode;
import com.tripplanner.trip.dto.TripMemberResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class TripMemberService {

    private final TripMemberRepository memberRepository;
    private final TripAccessService accessService;

    /** Chỉ OWNER; không gán OWNER và không đổi quyền của OWNER qua đây. */
    @Transactional
    public TripMemberResponse changeRole(Long tripId, Long actorId, Long targetUserId, TripRole role) {
        accessService.require(tripId, actorId, TripRole.OWNER);
        if (role == TripRole.OWNER) {
            throw new BusinessException(ErrorCode.INVALID_ROLE,
                    "Muốn đổi trưởng nhóm, hãy dùng chức năng chuyển quyền");
        }
        TripMember target = findTarget(tripId, targetUserId);
        if (target.getRole() == TripRole.OWNER) {
            throw new BusinessException(ErrorCode.CANNOT_CHANGE_OWNER_ROLE);
        }
        target.setRole(role);
        return TripMemberResponse.from(target);
    }

    /**
     * Hạ OWNER hiện tại xuống EDITOR rồi mới nâng người nhận, flush giữa hai bước để không
     * vi phạm UNIQUE (owner_trip_id) trong DB.
     */
    @Transactional
    public void transferOwnership(Long tripId, Long actorId, Long newOwnerId) {
        TripMember currentOwner = accessService.require(tripId, actorId, TripRole.OWNER);
        if (actorId.equals(newOwnerId)) {
            throw new BusinessException(ErrorCode.INVALID_TRANSFER);
        }
        TripMember newOwner = findTarget(tripId, newOwnerId);
        currentOwner.setRole(TripRole.EDITOR);
        memberRepository.saveAndFlush(currentOwner);
        newOwner.setRole(TripRole.OWNER);
        memberRepository.saveAndFlush(newOwner);
    }

    /** OWNER xóa người khác, hoặc bất kỳ ai tự rời nhóm (trừ OWNER). */
    @Transactional
    public void removeMember(Long tripId, Long actorId, Long targetUserId) {
        TripMember actor = accessService.require(tripId, actorId, TripRole.VIEWER);
        boolean leavingSelf = actorId.equals(targetUserId);
        if (leavingSelf) {
            if (actor.getRole() == TripRole.OWNER) {
                throw new BusinessException(ErrorCode.OWNER_CANNOT_LEAVE);
            }
            memberRepository.delete(actor);
            return;
        }
        if (actor.getRole() != TripRole.OWNER) {
            throw new BusinessException(ErrorCode.FORBIDDEN);
        }
        memberRepository.delete(findTarget(tripId, targetUserId));
    }

    private TripMember findTarget(Long tripId, Long userId) {
        return memberRepository.findMember(tripId, userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.MEMBER_NOT_FOUND));
    }
}
