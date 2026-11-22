package com.tripplanner.checklist;

import com.tripplanner.checklist.dto.ChecklistItemRequest;
import com.tripplanner.checklist.dto.ChecklistItemResponse;
import com.tripplanner.checklist.dto.ChecklistResponse;
import com.tripplanner.common.BusinessException;
import com.tripplanner.common.ErrorCode;
import com.tripplanner.trip.Trip;
import com.tripplanner.trip.TripAccessService;
import com.tripplanner.trip.TripMember;
import com.tripplanner.trip.TripMemberRepository;
import com.tripplanner.trip.TripRole;
import com.tripplanner.user.User;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Quyền: thêm/sửa/xóa món cần EDITOR+. Nhận món ("Tôi mang") thì mọi thành viên kể cả VIEWER.
 * Tick: người đang mang hoặc EDITOR+.
 */
@Service
@RequiredArgsConstructor
public class ChecklistService {

    private final ChecklistRepository checklistRepository;
    private final TripAccessService accessService;
    private final TripMemberRepository memberRepository;

    @Transactional(readOnly = true)
    public ChecklistResponse get(Long tripId, Long userId) {
        accessService.require(tripId, userId, TripRole.VIEWER);
        return build(tripId);
    }

    @Transactional
    public ChecklistResponse create(Long tripId, Long userId, ChecklistItemRequest request) {
        Trip trip = accessService.require(tripId, userId, TripRole.EDITOR).getTrip();
        ChecklistItem item = ChecklistItem.builder().trip(trip).build();
        apply(item, tripId, request);
        checklistRepository.save(item);
        return build(tripId);
    }

    @Transactional
    public ChecklistResponse update(Long itemId, Long userId, ChecklistItemRequest request) {
        ChecklistItem item = requireItem(itemId, userId, TripRole.EDITOR).item();
        apply(item, item.getTrip().getId(), request);
        return build(item.getTrip().getId());
    }

    @Transactional
    public ChecklistResponse delete(Long itemId, Long userId) {
        ChecklistItem item = requireItem(itemId, userId, TripRole.EDITOR).item();
        Long tripId = item.getTrip().getId();
        checklistRepository.delete(item);
        checklistRepository.flush();
        return build(tripId);
    }

    /** "Tôi mang": chỉ khi chưa ai nhận (chính mình nhận lại thì bỏ qua). */
    @Transactional
    public ChecklistResponse claim(Long itemId, Long userId) {
        Access access = requireItem(itemId, userId, TripRole.VIEWER);
        ChecklistItem item = access.item();
        if (item.getAssignee() != null && !item.getAssignee().getId().equals(userId)) {
            throw new BusinessException(ErrorCode.ALREADY_CLAIMED);
        }
        item.setAssignee(access.member().getUser());
        return build(item.getTrip().getId());
    }

    /** Bỏ nhận: chỉ người đang mang; món về "chưa ai nhận" và bỏ tick. */
    @Transactional
    public ChecklistResponse unclaim(Long itemId, Long userId) {
        ChecklistItem item = requireItem(itemId, userId, TripRole.VIEWER).item();
        if (item.getAssignee() == null || !item.getAssignee().getId().equals(userId)) {
            throw new BusinessException(ErrorCode.FORBIDDEN);
        }
        item.setAssignee(null);
        item.setChecked(false);
        return build(item.getTrip().getId());
    }

    @Transactional
    public ChecklistResponse check(Long itemId, Long userId, boolean checked) {
        Access access = requireItem(itemId, userId, TripRole.VIEWER);
        ChecklistItem item = access.item();
        boolean isAssignee = item.getAssignee() != null && item.getAssignee().getId().equals(userId);
        if (!isAssignee && !access.member().getRole().atLeast(TripRole.EDITOR)) {
            throw new BusinessException(ErrorCode.FORBIDDEN);
        }
        item.setChecked(checked);
        return build(item.getTrip().getId());
    }

    // ---------------------------------------------------------------- helpers

    private ChecklistResponse build(Long tripId) {
        List<ChecklistItemResponse> items = checklistRepository.findAllWithAssigneeByTripId(tripId).stream()
                .sorted(Comparator.comparing(ChecklistItem::getCategory))
                .map(ChecklistItemResponse::from)
                .toList();
        int checked = (int) items.stream().filter(ChecklistItemResponse::checked).count();
        int unassigned = (int) items.stream().filter(i -> i.assignee() == null).count();
        return new ChecklistResponse(items.size(), checked, unassigned, items);
    }

    private void apply(ChecklistItem item, Long tripId, ChecklistItemRequest request) {
        User assignee = null;
        if (request.assigneeId() != null) {
            assignee = memberRepository.findAllWithUserByTripId(tripId).stream()
                    .filter(m -> m.getUser().getId().equals(request.assigneeId()))
                    .map(TripMember::getUser)
                    .findFirst()
                    .orElseThrow(() -> new BusinessException(ErrorCode.ASSIGNEE_NOT_MEMBER));
        }
        Long oldAssigneeId = item.getAssignee() == null ? null : item.getAssignee().getId();
        if (item.getId() != null && !Objects.equals(oldAssigneeId, request.assigneeId())) {
            item.setChecked(false); // đổi người mang thì người mới tự tick lại
        }
        item.setItemName(request.itemName().trim());
        item.setCategory(request.category());
        item.setQuantity(request.quantity() == null ? 1 : request.quantity());
        item.setAssignee(assignee);
    }

    private record Access(ChecklistItem item, TripMember member) {
    }

    private Access requireItem(Long itemId, Long userId, TripRole minRole) {
        Long tripId = checklistRepository.findTripIdByItemId(itemId)
                .orElseThrow(() -> new BusinessException(ErrorCode.CHECKLIST_ITEM_NOT_FOUND));
        TripMember member = accessService.require(tripId, userId, minRole);
        ChecklistItem item = checklistRepository.findById(itemId)
                .orElseThrow(() -> new BusinessException(ErrorCode.CHECKLIST_ITEM_NOT_FOUND));
        return new Access(item, member);
    }
}
