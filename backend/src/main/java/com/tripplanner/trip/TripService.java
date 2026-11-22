package com.tripplanner.trip;

import com.tripplanner.common.BusinessException;
import com.tripplanner.common.ErrorCode;
import com.tripplanner.trip.dto.InviteCodeResponse;
import com.tripplanner.trip.dto.InvitePreviewResponse;
import com.tripplanner.trip.dto.JoinTripResponse;
import com.tripplanner.trip.dto.MemberPreview;
import com.tripplanner.trip.dto.TripDetailResponse;
import com.tripplanner.trip.dto.TripMemberResponse;
import com.tripplanner.trip.dto.TripRequest;
import com.tripplanner.trip.dto.TripSummaryResponse;
import com.tripplanner.user.User;
import com.tripplanner.user.UserService;
import java.time.Clock;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
@RequiredArgsConstructor
public class TripService {

    static final TripRole DEFAULT_JOIN_ROLE = TripRole.EDITOR;
    private static final int PREVIEW_MEMBERS = 5;
    private static final int INVITE_CODE_ATTEMPTS = 5;
    /** Khoảng khảo sát lịch rảnh tối đa (Phase 2). */
    static final int MAX_PLANNED_DAYS = 62;

    private final TripRepository tripRepository;
    private final TripMemberRepository memberRepository;
    private final TripAccessService accessService;
    private final InviteCodeGenerator inviteCodeGenerator;
    private final UserService userService;
    private final Clock clock;

    @Transactional
    public TripDetailResponse create(Long userId, TripRequest request) {
        User creator = userService.getRequired(userId);
        Trip trip = Trip.builder()
                .inviteCode(newUniqueInviteCode())
                .createdBy(creator)
                .build();
        applyRequest(trip, request);
        tripRepository.save(trip);
        memberRepository.save(new TripMember(trip, creator, TripRole.OWNER));
        return detail(trip, TripRole.OWNER);
    }

    @Transactional(readOnly = true)
    public List<TripSummaryResponse> listMine(Long userId) {
        List<TripMember> memberships = memberRepository.findMembershipsWithTrip(userId);
        if (memberships.isEmpty()) {
            return List.of();
        }
        List<Long> tripIds = memberships.stream().map(m -> m.getId().getTripId()).toList();
        Map<Long, List<TripMember>> membersByTrip = memberRepository.findAllWithUserByTripIds(tripIds).stream()
                .collect(Collectors.groupingBy(m -> m.getId().getTripId()));
        LocalDate today = today();

        return memberships.stream()
                .map(m -> {
                    Trip trip = m.getTrip();
                    List<TripMember> members = membersByTrip.getOrDefault(trip.getId(), List.of());
                    return new TripSummaryResponse(
                            trip.getId(), trip.getTitle(), trip.getDestination(), trip.getCoverImageUrl(),
                            trip.statusOn(today), trip.getPlannedStartDate(), trip.getPlannedEndDate(),
                            trip.getStartDate(), trip.getEndDate(), m.getRole(), members.size(),
                            members.stream().limit(PREVIEW_MEMBERS).map(tm -> MemberPreview.from(tm.getUser())).toList());
                })
                .sorted(dashboardOrder())
                .toList();
    }

    @Transactional(readOnly = true)
    public TripDetailResponse get(Long tripId, Long userId) {
        TripMember me = accessService.require(tripId, userId, TripRole.VIEWER);
        return detail(me.getTrip(), me.getRole());
    }

    @Transactional
    public TripDetailResponse update(Long tripId, Long userId, TripRequest request) {
        TripMember me = accessService.require(tripId, userId, TripRole.EDITOR);
        Trip trip = me.getTrip();
        applyRequest(trip, request);
        return detail(trip, me.getRole());
    }

    @Transactional
    public void delete(Long tripId, Long userId) {
        TripMember me = accessService.require(tripId, userId, TripRole.OWNER);
        Trip trip = me.getTrip();
        memberRepository.deleteAllByTripId(tripId);
        tripRepository.deleteById(trip.getId());
    }

    @Transactional
    public InviteCodeResponse regenerateInviteCode(Long tripId, Long userId) {
        Trip trip = accessService.require(tripId, userId, TripRole.OWNER).getTrip();
        trip.setInviteCode(newUniqueInviteCode());
        return new InviteCodeResponse(trip.getInviteCode());
    }

    @Transactional(readOnly = true)
    public InvitePreviewResponse previewInvite(String code) {
        Trip trip = findByInviteCode(code);
        return new InvitePreviewResponse(
                trip.getTitle(), trip.getDestination(), trip.getCoverImageUrl(), trip.statusOn(today()),
                (int) memberRepository.countByIdTripId(trip.getId()),
                trip.getPlannedStartDate(), trip.getPlannedEndDate(), trip.getStartDate(), trip.getEndDate());
    }

    /** Idempotent: đã là thành viên thì trả về quyền hiện tại. */
    @Transactional
    public JoinTripResponse join(String code, Long userId) {
        Trip trip = findByInviteCode(code);
        return memberRepository.findMember(trip.getId(), userId)
                .map(existing -> new JoinTripResponse(trip.getId(), existing.getRole(), true))
                .orElseGet(() -> {
                    User user = userService.getRequired(userId);
                    memberRepository.save(new TripMember(trip, user, DEFAULT_JOIN_ROLE));
                    return new JoinTripResponse(trip.getId(), DEFAULT_JOIN_ROLE, false);
                });
    }

    // ---------------------------------------------------------------- helpers

    private Trip findByInviteCode(String code) {
        return tripRepository.findByInviteCode(InviteCodeGenerator.normalize(code))
                .orElseThrow(() -> new BusinessException(ErrorCode.INVITE_NOT_FOUND));
    }

    private TripDetailResponse detail(Trip trip, TripRole myRole) {
        List<TripMemberResponse> members = memberRepository.findAllWithUserByTripId(trip.getId()).stream()
                .map(TripMemberResponse::from)
                .toList();
        String inviteCode = myRole.atLeast(TripRole.EDITOR) ? trip.getInviteCode() : null;
        return new TripDetailResponse(
                trip.getId(), trip.getTitle(), trip.getDestination(), trip.getDescription(), trip.getCoverImageUrl(),
                trip.statusOn(today()), trip.getPlannedStartDate(), trip.getPlannedEndDate(),
                trip.getStartDate(), trip.getEndDate(), inviteCode, myRole, members.size(), trip.getCreatedAt(),
                members);
    }

    private void applyRequest(Trip trip, TripRequest request) {
        LocalDate start = request.plannedStartDate();
        LocalDate end = request.plannedEndDate();
        if ((start == null) != (end == null)) {
            throw new BusinessException(ErrorCode.INVALID_DATE_RANGE,
                    "Cần nhập cả ngày bắt đầu và ngày kết thúc dự kiến");
        }
        if (start != null && end.isBefore(start)) {
            throw new BusinessException(ErrorCode.INVALID_DATE_RANGE,
                    "Ngày kết thúc phải sau hoặc bằng ngày bắt đầu");
        }
        if (start != null && ChronoUnit.DAYS.between(start, end) + 1 > MAX_PLANNED_DAYS) {
            throw new BusinessException(ErrorCode.INVALID_DATE_RANGE,
                    "Khoảng ngày dự kiến tối đa " + MAX_PLANNED_DAYS + " ngày");
        }
        trip.setTitle(request.title().trim());
        trip.setDestination(blankToNull(request.destination()));
        trip.setDescription(blankToNull(request.description()));
        trip.setCoverImageUrl(blankToNull(request.coverImageUrl()));
        trip.setPlannedStartDate(start);
        trip.setPlannedEndDate(end);
    }

    private String newUniqueInviteCode() {
        for (int i = 0; i < INVITE_CODE_ATTEMPTS; i++) {
            String code = inviteCodeGenerator.generate();
            if (!tripRepository.existsByInviteCode(code)) {
                return code;
            }
        }
        throw new BusinessException(ErrorCode.CONFLICT, "Không tạo được mã mời, vui lòng thử lại");
    }

    private LocalDate today() {
        return LocalDate.now(clock);
    }

    /**
     * Chuyến chưa kết thúc lên trước (ngày đi gần nhất trước, chưa có ngày xếp cuối nhóm),
     * chuyến đã hoàn thành xếp sau (mới kết thúc trước).
     */
    private static Comparator<TripSummaryResponse> dashboardOrder() {
        Comparator<TripSummaryResponse> byCompleted =
                Comparator.comparing(t -> t.status() == TripStatus.COMPLETED);
        Comparator<TripSummaryResponse> activeOrder = Comparator.comparing(
                TripService::anchorDate, Comparator.nullsLast(Comparator.naturalOrder()));
        Comparator<TripSummaryResponse> completedOrder = Comparator.comparing(
                TripSummaryResponse::endDate, Comparator.nullsLast(Comparator.reverseOrder()));
        return byCompleted.thenComparing((a, b) -> a.status() == TripStatus.COMPLETED
                ? completedOrder.compare(a, b)
                : activeOrder.compare(a, b))
                .thenComparing(TripSummaryResponse::id, Comparator.reverseOrder());
    }

    private static LocalDate anchorDate(TripSummaryResponse t) {
        return t.startDate() != null ? t.startDate() : t.plannedStartDate();
    }

    private static String blankToNull(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }
}
