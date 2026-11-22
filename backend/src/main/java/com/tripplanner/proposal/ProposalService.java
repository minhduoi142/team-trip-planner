package com.tripplanner.proposal;

import com.tripplanner.common.BusinessException;
import com.tripplanner.common.ErrorCode;
import com.tripplanner.itinerary.ItineraryItem;
import com.tripplanner.itinerary.ItineraryService;
import com.tripplanner.itinerary.dto.ItineraryItemRequest;
import com.tripplanner.proposal.dto.ProposalDtos.ProposalListResponse;
import com.tripplanner.proposal.dto.ProposalDtos.ProposalRequest;
import com.tripplanner.proposal.dto.ProposalDtos.ProposalResponse;
import com.tripplanner.proposal.dto.ProposalDtos.ScheduleProposalRequest;
import com.tripplanner.proposal.dto.ProposalDtos.ScheduledInfo;
import com.tripplanner.trip.Trip;
import com.tripplanner.trip.TripAccessService;
import com.tripplanner.trip.TripMember;
import com.tripplanner.trip.TripRole;
import com.tripplanner.tripday.TripDay;
import com.tripplanner.tripday.TripDayRepository;
import com.tripplanner.user.UserRepository;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

/**
 * Wishlist đề xuất (docs/sdd-proposals.md). Quyền: xem / thêm / thả tim: mọi thành viên; sửa / xóa: người tạo
 * hoặc OWNER; đưa vào lịch trình: EDITOR+. Mọi thao tác trả lại toàn bộ danh sách.
 */
@Service
@RequiredArgsConstructor
public class ProposalService {

    /** Chưa lên lịch trước (nhiều tim → cũ → id), đã lên lịch sau (ngày → giờ, chưa có giờ cuối → id). */
    static final Comparator<ProposalResponse> ORDER = (a, b) -> {
        boolean aScheduled = a.scheduled() != null;
        boolean bScheduled = b.scheduled() != null;
        if (aScheduled != bScheduled) {
            return aScheduled ? 1 : -1;
        }
        Comparator<ProposalResponse> within = aScheduled
                ? Comparator.comparingInt((ProposalResponse r) -> r.scheduled().dayIndex())
                        .thenComparing(r -> r.scheduled().startTime(), Comparator.nullsLast(Comparator.naturalOrder()))
                : Comparator.comparingInt(ProposalResponse::voteCount).reversed()
                        .thenComparing(ProposalResponse::createdAt);
        return within.thenComparing(ProposalResponse::id).compare(a, b);
    };

    private final TripAccessService accessService;
    private final TripProposalRepository proposalRepository;
    private final ProposalVoteRepository voteRepository;
    private final TripDayRepository dayRepository;
    private final UserRepository userRepository;
    private final ItineraryService itineraryService;

    @Transactional(readOnly = true)
    public ProposalListResponse list(Long tripId, Long userId) {
        TripMember me = accessService.require(tripId, userId, TripRole.VIEWER);
        return build(tripId, me);
    }

    @Transactional
    public ProposalListResponse create(Long tripId, Long userId, ProposalRequest request) {
        TripMember me = accessService.require(tripId, userId, TripRole.VIEWER);
        TripProposal proposal = TripProposal.builder()
                .trip(me.getTrip())
                .createdBy(userRepository.getReferenceById(userId))
                .build();
        apply(proposal, request);
        proposalRepository.save(proposal);
        return build(tripId, me);
    }

    /** Sửa không đụng tới hoạt động đã tạo trong lịch trình (2 bản độc lập). */
    @Transactional
    public ProposalListResponse update(Long proposalId, Long userId, ProposalRequest request) {
        Access access = requireAuthorOrOwner(proposalId, userId);
        apply(access.proposal(), request);
        return build(access.tripId(), access.me());
    }

    /** Hoạt động đã tạo từ đề xuất (nếu có) vẫn giữ trong lịch trình. */
    @Transactional
    public ProposalListResponse delete(Long proposalId, Long userId) {
        Access access = requireAuthorOrOwner(proposalId, userId);
        proposalRepository.delete(access.proposal());
        proposalRepository.flush();
        return build(access.tripId(), access.me());
    }

    /** Idempotent: đã thả tim thì giữ nguyên. */
    @Transactional
    public ProposalListResponse vote(Long proposalId, Long userId) {
        Access access = require(proposalId, userId, TripRole.VIEWER);
        ProposalVoteId id = new ProposalVoteId(proposalId, userId);
        if (!voteRepository.existsById(id)) {
            voteRepository.save(new ProposalVote(proposalId, userId));
        }
        return build(access.tripId(), access.me());
    }

    @Transactional
    public ProposalListResponse unvote(Long proposalId, Long userId) {
        Access access = require(proposalId, userId, TripRole.VIEWER);
        voteRepository.findById(new ProposalVoteId(proposalId, userId)).ifPresent(voteRepository::delete);
        voteRepository.flush();
        return build(access.tripId(), access.me());
    }

    /**
     * Đưa vào lịch trình trong 1 transaction: khóa hàng đề xuất → tạo hoạt động (tự chèn theo giờ) → gắn
     * itinerary_item_id. Lỗi ở bước nào cũng rollback cả hai.
     */
    @Transactional
    public ProposalListResponse schedule(Long proposalId, Long userId, ScheduleProposalRequest request) {
        Long tripId = tripOf(proposalId);
        TripMember me = accessService.require(tripId, userId, TripRole.EDITOR);
        TripProposal proposal = proposalRepository.findByIdForUpdate(proposalId)
                .orElseThrow(() -> new BusinessException(ErrorCode.PROPOSAL_NOT_FOUND));
        if (proposal.isScheduled()) {
            throw new BusinessException(ErrorCode.PROPOSAL_ALREADY_SCHEDULED);
        }
        Trip trip = me.getTrip();
        if (!trip.isLocked()) {
            throw new BusinessException(ErrorCode.NOT_LOCKED);
        }
        TripDay day = dayRepository.findById(request.dayId())
                .filter(d -> d.getTrip().getId().equals(tripId))
                .orElseThrow(() -> new BusinessException(ErrorCode.DAY_NOT_FOUND));
        if (day.isOverflow(trip)) {
            throw new BusinessException(ErrorCode.BAD_REQUEST, "Chỉ đưa được vào các ngày nằm trong khoảng đã chốt");
        }
        // Chỉ chép maps_url + note; link tham khảo (TikTok…) ở lại thẻ đề xuất
        ItineraryItem item = itineraryService.createItem(day.getId(), userId, new ItineraryItemRequest(
                proposal.getTitle(), request.category(), request.startTime(), request.endTime(),
                null, proposal.getMapsUrl(), proposal.getNote(), proposal.getEstimatedCost()));
        proposal.setItineraryItem(item);
        return build(tripId, me);
    }

    // ---------------------------------------------------------------- build

    private ProposalListResponse build(Long tripId, TripMember me) {
        Long myId = me.getId().getUserId();
        boolean isOwner = me.getRole() == TripRole.OWNER;
        Trip trip = me.getTrip();
        Map<Long, List<Long>> votersByProposal = voteRepository.findAllByTripId(tripId).stream()
                .collect(Collectors.groupingBy(v -> v.getId().getProposalId(),
                        Collectors.mapping(v -> v.getId().getUserId(), Collectors.toList())));

        List<ProposalResponse> proposals = proposalRepository.findAllByTripId(tripId).stream()
                .map(p -> {
                    List<Long> voters = votersByProposal.getOrDefault(p.getId(), List.of());
                    boolean canManage = isOwner || (p.getCreatedBy() != null && p.getCreatedBy().getId().equals(myId));
                    return new ProposalResponse(p.getId(), p.getTitle(), p.getCategory(), p.getMapsUrl(),
                            p.getReferenceUrl(), p.getEstimatedCost(), p.getNote(),
                            p.getCreatedBy() == null ? null : p.getCreatedBy().getDisplayName(),
                            p.getCreatedAt(), voters.size(), voters, voters.contains(myId),
                            canManage, canManage, scheduledInfo(p, trip));
                })
                .sorted(ORDER)
                .toList();
        return new ProposalListResponse(me.getRole().atLeast(TripRole.EDITOR), trip.isLocked(), proposals);
    }

    private static ScheduledInfo scheduledInfo(TripProposal proposal, Trip trip) {
        ItineraryItem item = proposal.getItineraryItem();
        if (item == null) {
            return null;
        }
        TripDay day = item.getTripDay();
        return new ScheduledInfo(item.getId(), day.getId(), day.getDayIndex(), day.dateIn(trip), item.getStartTime());
    }

    // ---------------------------------------------------------------- helpers

    private record Access(TripProposal proposal, Long tripId, TripMember me) {
    }

    private Long tripOf(Long proposalId) {
        return proposalRepository.findTripIdById(proposalId)
                .orElseThrow(() -> new BusinessException(ErrorCode.PROPOSAL_NOT_FOUND));
    }

    private Access require(Long proposalId, Long userId, TripRole minRole) {
        Long tripId = tripOf(proposalId);
        TripMember me = accessService.require(tripId, userId, minRole);
        TripProposal proposal = proposalRepository.findById(proposalId)
                .orElseThrow(() -> new BusinessException(ErrorCode.PROPOSAL_NOT_FOUND));
        return new Access(proposal, tripId, me);
    }

    private Access requireAuthorOrOwner(Long proposalId, Long userId) {
        Access access = require(proposalId, userId, TripRole.VIEWER);
        TripProposal proposal = access.proposal();
        boolean isAuthor = proposal.getCreatedBy() != null && proposal.getCreatedBy().getId().equals(userId);
        if (!isAuthor && access.me().getRole() != TripRole.OWNER) {
            throw new BusinessException(ErrorCode.FORBIDDEN);
        }
        return access;
    }

    private static void apply(TripProposal proposal, ProposalRequest request) {
        proposal.setTitle(request.title().trim());
        proposal.setCategory(request.category());
        proposal.setMapsUrl(blankToNull(request.mapsUrl()));
        proposal.setReferenceUrl(blankToNull(request.referenceUrl()));
        proposal.setEstimatedCost(request.estimatedCost());
        proposal.setNote(blankToNull(request.note()));
    }

    private static String blankToNull(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }
}
