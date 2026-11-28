package com.tripplanner.trip;

import com.tripplanner.checklist.ChecklistRepository;
import com.tripplanner.common.BusinessException;
import com.tripplanner.common.ErrorCode;
import com.tripplanner.expense.ExpenseRepository;
import com.tripplanner.expense.ExpenseShareRepository;
import com.tripplanner.expense.SettlementRepository;
import com.tripplanner.expense.TripFundRepository;
import com.tripplanner.notification.event.MemberLeft;
import com.tripplanner.poll.PollVoteRepository;
import com.tripplanner.outfit.DayOutfitRepository;
import com.tripplanner.proposal.ProposalVoteRepository;
import com.tripplanner.room.RoomAssignmentRepository;
import com.tripplanner.trip.dto.TripMemberResponse;
import com.tripplanner.document.DocumentService;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class TripMemberService {

    private final TripMemberRepository memberRepository;
    private final ChecklistRepository checklistRepository;
    private final ExpenseRepository expenseRepository;
    private final ExpenseShareRepository shareRepository;
    private final SettlementRepository settlementRepository;
    private final PollVoteRepository pollVoteRepository;
    private final ProposalVoteRepository proposalVoteRepository;
    private final RoomAssignmentRepository roomAssignmentRepository;
    private final TripFundRepository fundRepository;
    private final DocumentService documentService;
    private final DayOutfitRepository outfitRepository;
    private final TripAccessService accessService;
    private final ApplicationEventPublisher events;

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
            removeMembership(actor);
            events.publishEvent(new MemberLeft(tripId, actorId, null));
            return;
        }
        if (actor.getRole() != TripRole.OWNER) {
            throw new BusinessException(ErrorCode.FORBIDDEN);
        }
        removeMembership(findTarget(tripId, targetUserId));
        events.publishEvent(new MemberLeft(tripId, targetUserId, actorId));
    }

    /**
     * Chặn nếu còn dính tiền (số dư sẽ sai). Xóa phiếu bầu + tim đề xuất, bỏ giao món checklist (FK tổ hợp không CASCADE);
     * lịch rảnh tự xóa theo (CASCADE).
     */
    private void removeMembership(TripMember member) {
        Long tripId = member.getId().getTripId();
        Long userId = member.getId().getUserId();
        boolean treasurer = fundRepository.findWithTreasurer(tripId)
                .map(f -> f.getTreasurer().getId().equals(userId))
                .orElse(false);
        if (treasurer) {
            throw new BusinessException(ErrorCode.MEMBER_IS_TREASURER);
        }
        if (expenseRepository.existsPaidBy(tripId, userId)
                || shareRepository.existsForMember(tripId, userId)
                || settlementRepository.existsForMember(tripId, userId)) {
            throw new BusinessException(ErrorCode.MEMBER_HAS_EXPENSES);
        }
        pollVoteRepository.deleteAllForMemberInTrip(tripId, userId);
        proposalVoteRepository.deleteAllForMemberInTrip(tripId, userId);   // đề xuất họ tạo vẫn giữ
        roomAssignmentRepository.deleteAllForMemberInTrip(tripId, userId);
        outfitRepository.deleteAllForMemberInTrip(tripId, userId);   // outfit từng ngày (V12)
        documentService.deletePrivateOfMember(tripId, userId);       // giấy tờ riêng của họ (V15), kèm file
        checklistRepository.unassignAllForMember(tripId, userId);
        memberRepository.delete(member);
    }

    private TripMember findTarget(Long tripId, Long userId) {
        return memberRepository.findMember(tripId, userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.MEMBER_NOT_FOUND));
    }
}
